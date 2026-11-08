//! Pure earned-value and outward-status projections. Reads neither settle a
//! native interval nor write a clock, revision, condition or personal record.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::VerifiedDefinition;
use crate::narration::{
    GrammaticalPerson, NarrationPart, TemplateBinding, narration_template, render_narration_parts,
};
use crate::reception::{AttributeDisplay, AttributeKnowledge, AttributeView, ChangeFeedback};
use crate::state::{BodyProfile, Named};
use serde::ser::{SerializeSeq, Serializer};
use std::borrow::Cow;
use std::mem::size_of;

type Catalog = IndexMap<String, VerifiedDefinition<AttributeDefinition>>;
#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum AttributeAudience {
    Owner,
    Public,
}
#[derive(Debug)]
pub(crate) enum ProjectionError {
    Value(ValueError),
    Capacity,
    UnsupportedFamily,
}
impl From<ValueError> for ProjectionError {
    fn from(value: ValueError) -> Self {
        Self::Value(value)
    }
}
impl From<ProjectionError> for crate::execution::ExecutionError {
    fn from(value: ProjectionError) -> Self {
        match value {
            ProjectionError::Value(value) => Self::Values(value),
            ProjectionError::Capacity => Self::Capacity,
            ProjectionError::UnsupportedFamily => Self::UnsupportedFamily,
        }
    }
}
fn capacity() -> ProjectionError {
    ProjectionError::Capacity
}
fn sum<const N: usize>(values: [usize; N]) -> Result<usize, ProjectionError> {
    heap_sum(values).ok_or_else(capacity)
}
#[derive(Clone, Copy, Serialize)]
struct AttributeRange {
    min: f64,
    max: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AttributeInputState {
    value: AttributeValue,
    #[serde(skip_serializing_if = "Option::is_none")]
    range: Option<AttributeRange>,
    revision: u64,
    critical: bool,
    editor_critical: bool,
}
struct AttributeInput {
    pin: DefinitionPin,
    state: AttributeInputState,
}
impl HeapBytes for AttributeInput {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.pin.heap_bytes()?,
            match &self.state.value {
                AttributeValue::Number(_) => 0,
                AttributeValue::Category(value) => value.capacity(),
            },
        ])
    }
}
struct ProjectionKey<'a>(&'a [AttributeInput]);
impl Serialize for ProjectionKey<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for input in self.0 {
            seq.serialize_element(&(&input.pin, &input.state))?;
        }
        seq.end()
    }
}
pub(crate) struct PublicAttributeProjection {
    key: String,
    inputs: Vec<AttributeInput>,
    _reservation: ByteReservation,
}
impl PublicAttributeProjection {
    pub(crate) fn key(&self) -> &str {
        &self.key
    }
}
pub(crate) struct AttributeProjection {
    rows: Vec<AttributeView>,
    _reservation: ByteReservation,
}
impl AttributeProjection {
    pub(crate) fn rows(&self) -> &[AttributeView] {
        &self.rows
    }
    pub(crate) fn into_parts(self) -> (Vec<AttributeView>, ByteReservation) {
        (self.rows, self._reservation)
    }
}
fn threshold(
    entity: &Entity,
    d: &AttributeDefinition,
    value: f64,
    unit: Option<&str>,
) -> Result<f64, ProjectionError> {
    match unit {
        None => Ok(value),
        Some("fractionOfRange") => {
            let (min, max) = attribute_range(Some(entity), d).ok_or(ValueError::InvalidMeaning)?;
            Ok(min + value * (max - min))
        }
        _ => Err(ValueError::InvalidMeaning.into()),
    }
}
pub(crate) fn attribute_concern_active(
    entity: &Entity,
    d: &AttributeDefinition,
    value: &AttributeValue,
) -> Result<bool, ProjectionError> {
    let (Some(concern), AttributeValue::Number(value)) = (&d.concern, value) else {
        return Ok(false);
    };
    Ok(if concern.mode == "latched" {
        entity
            .stored_attributes()
            .and_then(|values| values.get(&d.id))
            .is_some_and(|state| state.concern_active == Some(true))
    } else {
        *value < threshold(entity, d, concern.below, concern.unit.as_deref())?
    })
}
fn critical(
    entity: &Entity,
    d: &AttributeDefinition,
    value: &AttributeValue,
    predicate: Option<&AttributeCriticalPredicate>,
) -> Result<bool, ProjectionError> {
    let Some(predicate) = predicate else {
        return Ok(false);
    };
    let AttributeCriticalPredicate::Compare { compare } = predicate else {
        return attribute_concern_active(entity, d, value);
    };
    let AttributeValue::Number(value) = value else {
        return Ok(false);
    };
    // Math.round resolves ties toward +infinity, including negative values.
    let compared = if compare.rounding == "nearest-integer" {
        let floor = value.floor();
        if value - floor >= 0.5 {
            floor + 1.0
        } else {
            floor
        }
    } else {
        *value
    };
    let cutoff = threshold(entity, d, compare.value, compare.unit.as_deref())?;
    match compare.operator.as_str() {
        "lessThan" => Ok(compared < cutoff),
        "lessThanOrEqual" => Ok(compared <= cutoff),
        _ => Err(ValueError::InvalidMeaning.into()),
    }
}
fn selected(audience: AttributeAudience, d: &AttributeDefinition) -> bool {
    audience == AttributeAudience::Owner || d.disclosure == "public"
}
fn capture_inputs(
    entity: &Entity,
    definitions: &Catalog,
    window: Option<&NativeValueWindow>,
    audience: AttributeAudience,
    budget: &ByteBudget,
) -> Result<(Vec<AttributeInput>, ByteReservation), ProjectionError> {
    let count = if entity.actor.is_some() {
        definitions
            .values()
            .filter(|d| selected(audience, d.value()))
            .count()
    } else {
        0
    };
    let mut bytes = count
        .checked_mul(size_of::<AttributeInput>())
        .ok_or_else(capacity)?;
    for definition in definitions
        .values()
        .filter(|d| selected(audience, d.value()))
    {
        bytes = sum([
            bytes,
            definition.pin().id.len(),
            definition.pin().digest.len(),
            entity
                .actor
                .as_ref()
                .and_then(|actor| actor.attributes.as_ref())
                .and_then(|values| values.get(&definition.value().id))
                .map_or(0, |state| match &state.value {
                    AttributeValue::Number(_) => 0,
                    AttributeValue::Category(value) => value.len(),
                }),
        ])?;
    }
    let mut reservation = budget
        .reserve(sum([size_of::<PublicAttributeProjection>(), bytes])?)
        .map_err(|_| capacity())?;
    let mut inputs = Vec::with_capacity(count);
    if let Some(actor) = &entity.actor {
        for definition in definitions
            .values()
            .filter(|d| selected(audience, d.value()))
        {
            let d = definition.value();
            // The sparse state projection supplies both value and revision in
            // one arithmetic read. Other installed hosts retain their own value.
            let current = actor
                .attributes
                .as_ref()
                .and_then(|a| a.get(&d.id))
                .map(|anchor| match window {
                    Some(window) => window.current_attribute(&entity.id, &d.id, anchor),
                    None => Ok(Cow::Borrowed(anchor)),
                })
                .transpose()?;
            let value = if matches!(
                d.implementation.as_str(),
                "number-v1" | "reservoir-v1" | "category-v1"
            ) {
                current.as_ref().map(|state| state.value.clone())
            } else {
                read_attribute(entity, d, window)?
            };
            let Some(value) = value else { continue };
            let range = if matches!(d.schema, AttributeSchema::Number { .. }) {
                attribute_range(Some(entity), d).map(|(min, max)| AttributeRange { min, max })
            } else {
                None
            };
            let state = AttributeInputState {
                revision: actor
                    .practice
                    .as_ref()
                    .and_then(|p| p.get(&d.id))
                    .map(|p| p.revision)
                    .or_else(|| current.as_ref().map(|state| state.revision))
                    .or_else(|| actor.body.as_ref().map(|body| body.revision))
                    .unwrap_or(0),
                range,
                critical: critical(entity, d, &value, d.critical.as_ref())?,
                editor_critical: critical(entity, d, &value, d.editor_critical.as_ref())?,
                value,
            };
            inputs.push(AttributeInput {
                pin: definition.pin().clone(),
                state,
            });
        }
    }
    reservation
        .resize(sum([
            size_of::<PublicAttributeProjection>(),
            inputs.heap_bytes().ok_or_else(capacity)?,
        ])?)
        .map_err(|_| capacity())?;
    Ok((inputs, reservation))
}
pub(crate) fn capture_public_attribute_projection(
    entity: &Entity,
    definitions: &Catalog,
    window: Option<&NativeValueWindow>,
    budget: &ByteBudget,
) -> Result<PublicAttributeProjection, ProjectionError> {
    let (inputs, mut reservation) = capture_inputs(
        entity,
        definitions,
        window,
        AttributeAudience::Public,
        budget,
    )?;
    let bytes = crate::encoding::json_record_len(&ProjectionKey(&inputs))
        .map_err(|_| ValueError::InvalidMeaning)?;
    reservation
        .resize(
            reservation
                .bytes()
                .checked_add(
                    bytes
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(64))
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
    let key = crate::encoding::json_record(&ProjectionKey(&inputs))
        .map_err(|_| ValueError::InvalidMeaning)?;
    reservation
        .resize(sum([
            size_of::<PublicAttributeProjection>(),
            inputs.heap_bytes().ok_or_else(capacity)?,
            key.capacity(),
        ])?)
        .map_err(|_| capacity())?;
    Ok(PublicAttributeProjection {
        key,
        inputs,
        _reservation: reservation,
    })
}
// A token consumes at least one template byte. This bounds all temporary
// narration parts, bound IDs/names and English grammar expansion before copies;
// the retained result is resized to its actual String/Vec capacities afterward.
fn template_bound_length(length: usize, entity: &Entity) -> Result<usize, ProjectionError> {
    let named = sum([
        entity.name.len(),
        entity.name_form.as_ref().map_or(0, String::len),
        entity.indefinite_article.as_ref().map_or(0, String::len),
    ])?;
    let per_token = sum([
        2 * size_of::<NarrationPart>(),
        entity.id.len(),
        named.checked_mul(24).ok_or_else(capacity)?,
        512,
    ])?;
    sum([
        length
            .checked_add(1)
            .and_then(|n| n.checked_mul(per_token))
            .ok_or_else(capacity)?,
        map_storage::<String, Named>(3).ok_or_else(capacity)?,
        map_storage::<&str, TemplateBinding<'_>>(3).ok_or_else(capacity)?,
    ])
}
fn template_bound(template: &str, entity: &Entity) -> Result<usize, ProjectionError> {
    template_bound_length(template.len(), entity)
}
fn own_text(template: &str, entity: &Entity) -> String {
    let named = Named {
        name: entity.name.clone(),
        name_form: entity.name_form.clone(),
        indefinite_article: entity.indefinite_article.clone(),
    };
    let bindings = IndexMap::from([(
        "subject",
        TemplateBinding::Entity {
            id: &entity.id,
            name: &named,
        },
    )]);
    let narration = narration_template(template, &bindings);
    render_narration_parts(
        &narration,
        &IndexMap::from([(entity.id.clone(), named)]),
        Some(&entity.id),
        GrammaticalPerson::First,
    )
}
fn render_inputs(
    inputs: &[AttributeInput],
    definitions: &Catalog,
    entity: Option<&Entity>,
    audience: AttributeAudience,
    budget: &ByteBudget,
) -> Result<AttributeProjection, ProjectionError> {
    let mut bytes = inputs
        .len()
        .checked_mul(size_of::<AttributeView>())
        .ok_or_else(capacity)?;
    for input in inputs {
        let d = definitions
            .get(&input.pin.id)
            .filter(|d| d.pin() == &input.pin)
            .ok_or(ValueError::InvalidMeaning)?
            .value();
        bytes = sum([
            bytes,
            d.id.len(),
            d.name.len(),
            d.presentation.icon.len(),
            d.presentation.color.len(),
            match &input.state.value {
                AttributeValue::Number(_) => 0,
                AttributeValue::Category(v) => v.len(),
            },
            match &d.schema {
                AttributeSchema::Number { unit, .. } => unit.len(),
                _ => 0,
            },
        ])?;
        if audience == AttributeAudience::Owner {
            let entity = entity.ok_or(ValueError::MissingEntity)?;
            bytes = sum([bytes, d.meaning.as_ref().map_or(0, String::len)])?;
            if let Some(policy) = &d.condition {
                if matches!(input.state.value, AttributeValue::Number(_)) {
                    let maximum = policy
                        .bands
                        .iter()
                        .map(|b| b.text.len())
                        .chain(std::iter::once(policy.clear_text.len()))
                        .max()
                        .unwrap_or(0);
                    bytes = sum([bytes, template_bound_length(maximum, entity)?])?;
                }
            }
            if let Some(concern) = &d.concern {
                bytes = sum([bytes, template_bound(&concern.text, entity)?])?;
            }
        }
    }
    let mut reservation = budget
        .reserve(sum([size_of::<AttributeProjection>(), bytes])?)
        .map_err(|_| capacity())?;
    let mut rows = Vec::with_capacity(inputs.len());
    for input in inputs {
        let d = definitions
            .get(&input.pin.id)
            .ok_or(ValueError::InvalidMeaning)?
            .value();
        let numeric = matches!(d.schema, AttributeSchema::Number { .. });
        let mut row = AttributeView {
            id: d.id.clone(),
            version: d.version,
            name: d.name.clone(),
            display: if numeric {
                AttributeDisplay::Meter
            } else {
                AttributeDisplay::Category
            },
            presentation: crate::reception::AttributePresentation {
                icon: d.presentation.icon.clone(),
                color: d.presentation.color.clone(),
            },
            change_feedback: (numeric
                && matches!(
                    d.implementation.as_str(),
                    "number-v1" | "reservoir-v1" | "category-v1" | "native-health-v1"
                ))
            .then_some(ChangeFeedback::Effects),
            body_health: (d.implementation == "native-health-v1").then_some(true),
            value: Some(input.state.value.clone()),
            status: AttributeKnowledge::Known,
            critical: Some(input.state.critical),
            editor_critical: Some(input.state.editor_critical),
            revision: input.state.revision,
            min: input.state.range.map(|r| r.min),
            max: input.state.range.map(|r| r.max),
            unit: match &d.schema {
                AttributeSchema::Number { unit, .. } => Some(unit.clone()),
                _ => None,
            },
            editor_critical_comparison: None,
            meaning: None,
            condition: None,
            concern: None,
        };
        if audience == AttributeAudience::Owner {
            let entity = entity.ok_or(ValueError::MissingEntity)?;
            if let Some(AttributeCriticalPredicate::Compare { compare }) = &d.editor_critical {
                row.editor_critical_comparison = Some(crate::reception::AttributeComparison {
                    operator: match compare.operator.as_str() {
                        "lessThan" => crate::reception::ComparisonOperator::LessThan,
                        "lessThanOrEqual" => crate::reception::ComparisonOperator::LessThanOrEqual,
                        _ => return Err(ValueError::InvalidMeaning.into()),
                    },
                    rounding: if compare.rounding == "nearest-integer" {
                        crate::reception::ComparisonRounding::NearestInteger
                    } else {
                        crate::reception::ComparisonRounding::None
                    },
                    value: threshold(entity, d, compare.value, compare.unit.as_deref())?,
                    unit: None,
                });
            }
            row.meaning = d
                .meaning
                .as_ref()
                .filter(|meaning| !meaning.is_empty())
                .cloned();
            if let (Some(policy), AttributeValue::Number(value)) =
                (&d.condition, &input.state.value)
            {
                let severity = policy
                    .bands
                    .iter()
                    .filter(|band| {
                        if band.inclusive == Some(true) {
                            *value <= band.below
                        } else {
                            *value < band.below
                        }
                    })
                    .count();
                let template = if severity > 0 {
                    &policy.bands[severity - 1].text
                } else {
                    &policy.clear_text
                };
                row.condition = Some(own_text(template, entity));
            }
            if attribute_concern_active(entity, d, &input.state.value)? {
                row.concern = Some(own_text(
                    &d.concern.as_ref().ok_or(ValueError::InvalidMeaning)?.text,
                    entity,
                ));
            }
        }
        rows.push(row);
    }
    reservation
        .resize(sum([
            size_of::<AttributeProjection>(),
            rows.heap_bytes().ok_or_else(capacity)?,
        ])?)
        .map_err(|_| capacity())?;
    Ok(AttributeProjection {
        rows,
        _reservation: reservation,
    })
}
pub(crate) fn project_public_attribute_projection(
    projection: &PublicAttributeProjection,
    definitions: &Catalog,
    budget: &ByteBudget,
) -> Result<AttributeProjection, ProjectionError> {
    render_inputs(
        &projection.inputs,
        definitions,
        None,
        AttributeAudience::Public,
        budget,
    )
}
pub(crate) fn project_attributes(
    entity: &Entity,
    definitions: &Catalog,
    window: Option<&NativeValueWindow>,
    audience: AttributeAudience,
    budget: &ByteBudget,
) -> Result<AttributeProjection, ProjectionError> {
    let (inputs, _reservation) = capture_inputs(entity, definitions, window, audience, budget)?;
    render_inputs(&inputs, definitions, Some(entity), audience, budget)
}

/// Installed LocalPose is a separate physical family; accepted commands cannot
/// create one while that family is unconverted. Ordinary rest changes occupied
/// bounds only and keeps Source eye/ear anchors in this actual body profile.
pub(crate) struct EffectiveBodyProfile<'a> {
    profile: Cow<'a, BodyProfile>,
    _reservation: Option<ByteReservation>,
}
impl std::ops::Deref for EffectiveBodyProfile<'_> {
    type Target = BodyProfile;
    fn deref(&self) -> &Self::Target {
        &self.profile
    }
}
pub(crate) fn effective_body_profile<'a>(
    entity: &'a Entity,
    budget: &ByteBudget,
) -> Result<EffectiveBodyProfile<'a>, ProjectionError> {
    if entity.spatial.local_pose.is_some() {
        return Err(ProjectionError::UnsupportedFamily);
    }
    let reservation = if entity.spatial.soft_footprint.is_some() {
        let ordinary = entity.ordinary_body_profile();
        Some(
            budget
                .reserve(sum([size_of::<BodyProfile>(), ordinary.id.len()])?)
                .map_err(|_| capacity())?,
        )
    } else {
        None
    };
    Ok(EffectiveBodyProfile {
        profile: entity.body_profile(),
        _reservation: reservation,
    })
}

use crate::worlds::base_observed::{
    Particle, ParticleAnchor, ParticleMotion, ProjectedPose, StatusEffectProjection,
};
pub(crate) struct StatusProjection {
    rows: Vec<StatusEffectProjection>,
    _reservation: ByteReservation,
}
impl StatusProjection {
    pub(crate) fn rows(&self) -> &[StatusEffectProjection] {
        &self.rows
    }
    pub(crate) fn into_parts(self) -> (Vec<StatusEffectProjection>, ByteReservation) {
        (self.rows, self._reservation)
    }
}
pub(crate) fn project_status_effects(
    entity: &Entity,
    policy: &StatusEffectPolicy,
    audience: AttributeAudience,
    budget: &ByteBudget,
) -> Result<StatusProjection, ProjectionError> {
    let states = entity.status_effects.as_ref();
    if states.is_some_and(|states| states.values().any(|state| state.contribution.is_some())) {
        return Err(ProjectionError::UnsupportedFamily);
    }
    let active = |definition: &&StatusDefinition| {
        states
            .and_then(|states| states.get(&definition.id))
            .is_some_and(|state| state.active)
    };
    let mut bytes = 0usize;
    let mut count = 0usize;
    for definition in policy.definitions.iter().filter(active) {
        if definition.contribution.is_some() {
            return Err(ProjectionError::UnsupportedFamily);
        }
        if definition.presentation.is_none() && definition.actions.is_none() {
            continue;
        }
        count = count.checked_add(1).ok_or_else(capacity)?;
        bytes = sum([
            bytes,
            size_of::<StatusEffectProjection>(),
            definition.id.len(),
            definition.label.len(),
            definition
                .presentation
                .as_ref()
                .and_then(|p| p.particle.as_ref())
                .map_or(0, |p| p.text.len()),
            if audience == AttributeAudience::Owner {
                sum([
                    definition.meaning.as_ref().map_or(0, String::len),
                    definition
                        .actions
                        .as_ref()
                        .and_then(|a| a.activate_icon.as_ref())
                        .map_or(0, String::len),
                ])?
            } else {
                0
            },
        ])?;
    }
    let mut reservation = budget
        .reserve(sum([size_of::<StatusProjection>(), bytes])?)
        .map_err(|_| capacity())?;
    let mut rows = Vec::with_capacity(count);
    for definition in policy.definitions.iter().filter(active) {
        if definition.presentation.is_none() && definition.actions.is_none() {
            continue;
        }
        let presentation = definition.presentation.as_ref();
        let pose = presentation
            .and_then(|p| p.pose.as_deref())
            .map(|pose| match pose {
                "horizontal" => Ok(ProjectedPose::Horizontal),
                _ => Err(ValueError::InvalidMeaning),
            })
            .transpose()?;
        let particle = presentation
            .and_then(|p| p.particle.as_ref())
            .map(|particle| {
                Ok::<_, ValueError>(Particle {
                    text: particle.text.clone(),
                    anchor: match particle.anchor.as_str() {
                        "head" => ParticleAnchor::Head,
                        _ => return Err(ValueError::InvalidMeaning),
                    },
                    motion: match particle.motion.as_str() {
                        "floatAway" => ParticleMotion::FloatAway,
                        _ => return Err(ValueError::InvalidMeaning),
                    },
                })
            })
            .transpose()?;
        rows.push(StatusEffectProjection {
            id: definition.id.clone(),
            label: definition.label.clone(),
            pose,
            particle,
            timing: None,
            explanation: if audience == AttributeAudience::Owner {
                definition
                    .meaning
                    .as_ref()
                    .filter(|meaning| !meaning.is_empty())
                    .cloned()
            } else {
                None
            },
            icon: if audience == AttributeAudience::Owner {
                definition
                    .actions
                    .as_ref()
                    .and_then(|actions| actions.activate_icon.as_ref())
                    .filter(|icon| !icon.is_empty())
                    .cloned()
            } else {
                None
            },
        });
    }
    reservation
        .resize(sum([
            size_of::<StatusProjection>(),
            rows.heap_bytes().ok_or_else(capacity)?,
        ])?)
        .map_err(|_| capacity())?;
    Ok(StatusProjection {
        rows,
        _reservation: reservation,
    })
}
