//! Installed attribute/status arithmetic. These are the existing trusted family
//! operators and authored data, never generated executable code or world tuning.

use crate::state::{Entity, UnconvertedField};
use crate::values::{
    ArithmeticAttributeMeaning, ArithmeticMeaning, ArithmeticRateChoice, AttributeValue,
    DefinitionPin, NativeValueDemand, NativeValueWindow, ValueError, deserialize_present_option,
    deserialize_safe_integer,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributePresentation {
    pub icon: String,
    pub color: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeHealth {
    pub units: String,
    pub precision: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum AttributeSchema {
    Number {
        min: f64,
        max: f64,
        initial: f64,
        unit: String,
    },
    Category {
        choices: Vec<String>,
        initial: String,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConditionBand {
    pub below: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub inclusive: Option<bool>,
    pub text: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConditionPolicy {
    pub bands: Vec<ConditionBand>,
    pub clear_text: String,
    pub recovery_margin: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub critical_severity: u64,
    pub review_seconds: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeConcern {
    pub below: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub unit: Option<String>,
    pub text: String,
    pub mode: String,
    pub notify: bool,
    pub reconsider: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recovery_margin: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Reservoir {
    pub drain_per_second: f64,
    pub replenish_per_second: f64,
    pub work_seconds: f64,
    pub action_label: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeCriticalComparison {
    pub operator: String,
    pub value: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub unit: Option<String>,
    pub rounding: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum AttributeCriticalPredicate {
    Compare {
        compare: AttributeCriticalComparison,
    },
    Concern {
        #[serde(rename = "concernActive")]
        concern_active: bool,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CoachingEligibility {
    pub communication: String,
    pub manual_work: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PracticePresentation {
    pub ranks: [String; 2],
    pub unavailable_rank: String,
    pub effect: String,
    pub progress: String,
    pub authored_starting: String,
    pub evidence_heading: String,
    pub evidence_item: String,
    pub evidence_fallback: String,
    pub lane_out_of_reach: String,
    pub lane_blocked: String,
    pub lane_unsafe: String,
    pub practice_description: String,
    pub practice_activity_label: String,
    pub coaching_activity_label: String,
    pub selected_tool: String,
    pub missing_tool: String,
    pub target_chance: String,
    pub request_label: String,
    pub request_description: String,
    pub accept_label: String,
    pub accept_description: String,
    pub decline_label: String,
    pub decline_description: String,
    pub feedback_description: String,
    pub withdraw_label: String,
    pub withdraw_description: String,
    pub unavailable: String,
    pub observation_required: String,
    pub request_result: String,
    pub request_event_suffix: String,
    pub accept_result: String,
    pub accept_event_suffix: String,
    pub end_result: String,
    pub observed_event: String,
    pub complete_result: String,
    pub cancel_result: String,
    pub ended_event: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PracticeProfile {
    pub coaching_eligibility: CoachingEligibility,
    pub presentation: PracticePresentation,
    pub family: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub independent_releases: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub coached_releases: u64,
    pub miss_reduction: f64,
    pub windup_seconds: f64,
    pub feedback_seconds: f64,
    pub communication_range: f64,
    pub lane_margin: f64,
    pub practice_label: String,
    pub coaching_label: String,
    pub scope: String,
    pub guidance: String,
    pub improved_text: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeDefinition {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub native_health: Option<NativeHealth>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub practice: Option<PracticeProfile>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub meaning: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub condition: Option<ConditionPolicy>,
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub implementation: String,
    pub name: String,
    pub disclosure: String,
    pub presentation: AttributePresentation,
    pub schema: AttributeSchema,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub concern: Option<AttributeConcern>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub critical: Option<AttributeCriticalPredicate>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub editor_critical: Option<AttributeCriticalPredicate>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reservoir: Option<Reservoir>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum EntityReference {
    #[serde(rename = "$subject")]
    Subject,
    #[serde(rename = "$source")]
    Source,
    #[serde(rename = "$actionTarget")]
    ActionTarget,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Comparison {
    Equal,
    NotEqual,
    LessThan,
    LessThanOrEqual,
    GreaterThanOrEqual,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum StatusValue {
    Number(f64),
    Text(String),
    Boolean(bool),
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeComparison {
    pub target: EntityReference,
    pub attribute: String,
    pub operator: Comparison,
    pub value: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub unit: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FieldComparison {
    pub target: EntityReference,
    pub name: String,
    pub operator: Comparison,
    pub value: StatusValue,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DailyWindow {
    pub target: String,
    pub clock: String,
    pub start: f64,
    pub end: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HasAttribute {
    pub target: EntityReference,
    pub attribute: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusActive {
    pub target: EntityReference,
    pub definition_id: String,
    pub value: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum StatusCondition {
    All {
        all: Vec<StatusCondition>,
    },
    Any {
        any: Vec<StatusCondition>,
    },
    Compare {
        compare: AttributeComparison,
    },
    Field {
        field: FieldComparison,
    },
    Daily {
        #[serde(rename = "dailyWindow")]
        daily_window: DailyWindow,
    },
    Has {
        #[serde(rename = "hasAttribute")]
        has_attribute: HasAttribute,
    },
    Active {
        #[serde(rename = "statusActive")]
        status_active: StatusActive,
    },
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ChangeRate {
    pub target: EntityReference,
    pub attribute: String,
    pub amount: f64,
    pub per: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ChangeEvery {
    pub target: EntityReference,
    pub attribute: String,
    pub amount: f64,
    pub every_game_seconds: f64,
    pub unit: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RestrictCapabilities {
    pub target: String,
    pub capabilities: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum StatusOperation {
    Rate {
        #[serde(rename = "changeRate")]
        change_rate: ChangeRate,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        when: Option<StatusCondition>,
    },
    Every {
        #[serde(rename = "changeEvery")]
        change_every: ChangeEvery,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        when: Option<StatusCondition>,
    },
    Restrict {
        #[serde(rename = "restrictCapabilities")]
        restrict_capabilities: RestrictCapabilities,
    },
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusParticle {
    pub text: String,
    pub anchor: String,
    pub motion: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusPresentation {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pose: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub particle: Option<StatusParticle>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusEmit {
    pub target: EntityReference,
    #[serde(rename = "type")]
    pub kind: String,
    pub narration: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusLifecycleEvent {
    pub emit: StatusEmit,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusActions {
    pub activate: String,
    pub deactivate: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub activate_icon: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub deactivate_icon: Option<String>,
    pub allow_other: bool,
    pub activate_other: bool,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusDefinition {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub target: EntityReference,
    pub label: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub meaning: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub lifecycle_cause: Option<String>,
    pub enabled: bool,
    pub requires: StatusCondition,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub activation_condition: Option<StatusCondition>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub automatic_activation: Option<StatusCondition>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub automatic_deactivation: Option<StatusCondition>,
    pub reactivation_delay_seconds: f64,
    pub occupies_action: bool,
    pub interrupt_on: Vec<String>,
    pub while_active: Vec<StatusOperation>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub presentation: Option<StatusPresentation>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub on_activate: Option<StatusLifecycleEvent>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub on_deactivate: Option<StatusLifecycleEvent>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub actions: Option<StatusActions>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub contribution: Option<UnconvertedField>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusEffectPolicy {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub clock_offset_hours: f64,
    pub named_times: IndexMap<String, f64>,
    pub definitions: Vec<StatusDefinition>,
}

/// Rebuildable membership compiled once from the immutable installed policy.
/// Activity is always read from the current canonical status instances.
pub struct StatusCapabilities {
    restrictions: IndexMap<String, Vec<String>>,
}
impl StatusCapabilities {
    pub fn compile(policy: &StatusEffectPolicy) -> Self {
        let mut restrictions: IndexMap<String, Vec<String>> = IndexMap::new();
        for definition in &policy.definitions {
            for operation in &definition.while_active {
                if let StatusOperation::Restrict {
                    restrict_capabilities,
                } = operation
                {
                    for capability in &restrict_capabilities.capabilities {
                        let ids = restrictions.entry(capability.clone()).or_default();
                        if !ids.contains(&definition.id) {
                            ids.push(definition.id.clone());
                        }
                    }
                }
            }
        }
        Self { restrictions }
    }

    pub fn capability_blocked(
        &self,
        entity: Option<&Entity>,
        capability: &str,
    ) -> Result<bool, ValueError> {
        let Some(states) = entity.and_then(|e| e.status_effects.as_ref()) else {
            return Ok(false);
        };
        // The selected ordinary-status closure cannot interpret an independent
        // contribution's lifetime/source. Installation must refuse it until its
        // actual owner is ported, rather than silently granting perception.
        if states.values().any(|state| state.contribution.is_some()) {
            return Err(ValueError::InvalidMeaning);
        }
        Ok(self.restrictions.get(capability).is_some_and(|ids| {
            ids.iter()
                .any(|id| states.get(id).is_some_and(|state| state.active))
        }))
    }
}

/// Pure current attribute read through the exact installed storage family.
pub fn read_attribute(
    entity: &Entity,
    definition: &AttributeDefinition,
    window: Option<&NativeValueWindow>,
) -> Result<Option<AttributeValue>, ValueError> {
    let Some(actor) = &entity.actor else {
        return Ok(None);
    };
    match definition.implementation.as_str() {
        "number-v1" | "reservoir-v1" | "category-v1" => {
            let Some(anchor) = actor
                .attributes
                .as_ref()
                .and_then(|a| a.get(&definition.id))
            else {
                return Ok(None);
            };
            match window {
                Some(window) => Ok(Some(
                    window
                        .current_attribute(&entity.id, &definition.id, anchor)?
                        .value
                        .clone(),
                )),
                None => Ok(Some(anchor.value.clone())),
            }
        }
        "finite-practice-v1" => {
            let Some(progress) = actor
                .practice
                .as_ref()
                .and_then(|values| values.get(&definition.id))
            else {
                return Ok(None);
            };
            let Some(profile) = &definition.practice else {
                return Ok(None);
            };
            Ok(Some(AttributeValue::Number(
                if progress.starting == 1
                    || progress.releases.len() as u64 >= profile.independent_releases
                    || (progress.coaching.is_some()
                        && progress.releases.len() as u64 >= profile.coached_releases)
                {
                    1.0
                } else {
                    0.0
                },
            )))
        }
        "native-health-v1" => {
            let (AttributeSchema::Number { min, max, .. }, Some(body)) =
                (&definition.schema, &actor.body)
            else {
                return Ok(None);
            };
            if !body.max_health.is_finite() || body.max_health <= 0.0 {
                return Ok(None);
            };
            if definition
                .native_health
                .as_ref()
                .is_some_and(|h| h.units == "points")
            {
                return Ok(Some(AttributeValue::Number(actor.health)));
            };
            let range = max - min;
            Ok(Some(AttributeValue::Number(
                min + if range == body.max_health {
                    actor.health
                } else {
                    actor.health / body.max_health * range
                },
            )))
        }
        _ => Err(ValueError::InvalidMeaning),
    }
}

pub fn attribute_range(
    entity: Option<&Entity>,
    definition: &AttributeDefinition,
) -> Option<(f64, f64)> {
    let AttributeSchema::Number { min, max, .. } = definition.schema else {
        return None;
    };
    if definition
        .native_health
        .as_ref()
        .is_some_and(|health| health.units == "points")
    {
        if let Some(body) = entity
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.body.as_ref())
        {
            return Some((0.0, body.max_health));
        }
    }
    Some((min, max))
}

/// Same unbound numeric boundaries used by statusArithmeticThresholds. Crossing
/// either side stays eager; neither a new native representation nor restore
/// changes latched concern/condition meaning.
pub fn arithmetic_thresholds(definition: &AttributeDefinition) -> Result<Vec<f64>, ValueError> {
    let AttributeSchema::Number { min, max, .. } = definition.schema else {
        return Err(ValueError::InvalidMeaning);
    };
    let mut values = vec![min, max];
    if let Some(concern) = &definition.concern {
        let below = if concern.unit.as_deref() == Some("fractionOfRange") {
            min + concern.below * (max - min)
        } else {
            concern.below
        };
        values.push(below);
        values.push(max.min(below + concern.recovery_margin.unwrap_or(0.0)));
    }
    if let Some(condition) = &definition.condition {
        for band in &condition.bands {
            values.push(band.below);
            values.push(max.min(band.below + condition.recovery_margin));
        }
    }
    Ok(values)
}

impl StatusCondition {
    pub fn node_count(&self) -> u64 {
        1 + match self {
            Self::All { all } => all.iter().map(Self::node_count).sum(),
            Self::Any { any } => any.iter().map(Self::node_count).sum(),
            _ => 0,
        }
    }
    fn visit_references(&self, visit: &mut impl FnMut(EntityReference)) {
        match self {
            Self::All { all } => {
                for child in all {
                    child.visit_references(visit)
                }
            }
            Self::Any { any } => {
                for child in any {
                    child.visit_references(visit)
                }
            }
            Self::Compare { compare } => visit(compare.target),
            Self::Field { field } => visit(field.target),
            Self::Has { has_attribute } => visit(has_attribute.target),
            Self::Active { status_active } => visit(status_active.target),
            Self::Daily { .. } => {}
        }
    }
}
impl StatusOperation {
    pub fn condition(&self) -> Option<&StatusCondition> {
        match self {
            Self::Rate { when, .. } | Self::Every { when, .. } => when.as_ref(),
            Self::Restrict { .. } => None,
        }
    }
}

/// Charged admitted tests/effects retain their current native-work.ts meaning;
/// output/retention reservation remains with the existing work owner.
pub fn status_work(definition: &StatusDefinition) -> NativeValueDemand {
    let tests = 4
        + definition.requires.node_count()
        + definition
            .activation_condition
            .as_ref()
            .map_or(0, StatusCondition::node_count)
        + definition
            .automatic_activation
            .as_ref()
            .map_or(0, StatusCondition::node_count)
        + 2 * definition
            .automatic_deactivation
            .as_ref()
            .map_or(0, StatusCondition::node_count)
        + definition
            .while_active
            .iter()
            .map(|op| op.condition().map_or(0, StatusCondition::node_count) + 1)
            .sum::<u64>();
    NativeValueDemand {
        tests,
        effects: definition.while_active.len() as u64 + 2,
    }
}

/// Compile from actual installed definitions, never captured rates in a save.
/// Predicate truth is deliberately not replayed: it may have changed at the
/// endpoint after earning this interval.
pub fn compile_arithmetic_meaning(
    definition: &StatusDefinition,
    attributes: &dyn AttributeDefinitions,
) -> Result<ArithmeticMeaning, ValueError> {
    let mut meaning = ArithmeticMeaning {
        linear: true,
        source_self_required: false,
        action_target_self_required: false,
        targets_self: true,
        while_active_len: definition.while_active.len(),
        demand: status_work(definition),
        attributes: IndexMap::new(),
    };
    let mut reference = |target| match target {
        EntityReference::Source => meaning.source_self_required = true,
        EntityReference::ActionTarget => meaning.action_target_self_required = true,
        EntityReference::Subject => {}
    };
    for condition in std::iter::once(&definition.requires)
        .chain(definition.activation_condition.iter())
        .chain(definition.automatic_activation.iter())
        .chain(definition.automatic_deactivation.iter())
        .chain(
            definition
                .while_active
                .iter()
                .filter_map(StatusOperation::condition),
        )
    {
        condition.visit_references(&mut reference)
    }
    for operation in &definition.while_active {
        match operation {
            StatusOperation::Rate { change_rate, when } => {
                match change_rate.target {
                    EntityReference::Source => meaning.source_self_required = true,
                    EntityReference::ActionTarget => meaning.action_target_self_required = true,
                    EntityReference::Subject => {}
                }
                let installed = attributes
                    .get(&change_rate.attribute)
                    .ok_or(ValueError::InvalidMeaning)?;
                let AttributeSchema::Number { min, max, .. } = installed.schema else {
                    return Err(ValueError::InvalidMeaning);
                };
                let ordinary_numeric =
                    installed.implementation == "number-v1" && installed.reservoir.is_none();
                let thresholds = arithmetic_thresholds(installed)?;
                let captured = meaning
                    .attributes
                    .entry(change_rate.attribute.clone())
                    .or_insert_with(|| ArithmeticAttributeMeaning {
                        ordinary_numeric,
                        min,
                        max,
                        thresholds,
                        rates: Vec::new(),
                    });
                captured.rates.push(ArithmeticRateChoice {
                    rate: change_rate.amount,
                    optional: when.is_some(),
                });
            }
            StatusOperation::Restrict { .. } => {}
            StatusOperation::Every { .. } => meaning.linear = false,
        }
    }
    Ok(meaning)
}

/// One synchronous read of canonical current state. No mutable borrow, provider,
/// host clock or whole-world copy participates in predicate evaluation.
pub trait AttributeDefinitions {
    fn get(&self, id: &str) -> Option<&AttributeDefinition>;
}
impl AttributeDefinitions for IndexMap<String, AttributeDefinition> {
    fn get(&self, id: &str) -> Option<&AttributeDefinition> {
        IndexMap::get(self, id)
    }
}
impl AttributeDefinitions
    for IndexMap<String, crate::install::VerifiedDefinition<AttributeDefinition>>
{
    fn get(&self, id: &str) -> Option<&AttributeDefinition> {
        IndexMap::get(self, id).map(|definition| definition.value())
    }
}

pub struct StatusRead<'a> {
    pub entities: &'a crate::state::EntityStore,
    pub attributes: &'a dyn AttributeDefinitions,
    pub window: Option<&'a NativeValueWindow>,
    pub policy: &'a StatusEffectPolicy,
    pub sim_time: f64,
}

#[derive(Clone, Copy, Debug)]
pub struct EffectBindings<'a> {
    pub subject: &'a str,
    pub source: &'a str,
    pub action_target: &'a str,
}

impl<'a> EffectBindings<'a> {
    pub fn for_status(subject: &'a str, status: Option<&'a crate::values::StatusInstance>) -> Self {
        match status {
            Some(status) => Self {
                subject,
                source: &status.source_id,
                action_target: &status.action_target_id,
            },
            None => Self {
                subject,
                source: subject,
                action_target: subject,
            },
        }
    }
    fn target(self, reference: EntityReference) -> &'a str {
        match reference {
            EntityReference::Subject => self.subject,
            EntityReference::Source => self.source,
            EntityReference::ActionTarget => self.action_target,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ConditionEvaluation {
    pub matches: bool,
    /// Actual visited predicates, including short-circuit behavior. The native
    /// work owner retains admission/charging; this read invents no paid work.
    pub tests: u64,
}

fn compare_status(left: Option<&StatusValue>, operator: Comparison, right: &StatusValue) -> bool {
    let Some(left) = left else { return false };
    match operator {
        Comparison::Equal => left == right,
        Comparison::NotEqual => left != right,
        Comparison::LessThan => {
            matches!((left,right),(StatusValue::Number(a),StatusValue::Number(b)) if a < b)
        }
        Comparison::LessThanOrEqual => {
            matches!((left,right),(StatusValue::Number(a),StatusValue::Number(b)) if a <= b)
        }
        Comparison::GreaterThanOrEqual => {
            matches!((left,right),(StatusValue::Number(a),StatusValue::Number(b)) if a >= b)
        }
    }
}

impl StatusRead<'_> {
    fn value(
        &self,
        entity_id: &str,
        attribute_id: &str,
    ) -> Result<Option<AttributeValue>, ValueError> {
        let (Some(entity), Some(definition)) = (
            self.entities.get(entity_id),
            self.attributes.get(attribute_id),
        ) else {
            return Ok(None);
        };
        if entity.actor.is_some() {
            read_attribute(entity, definition, self.window)
        } else {
            // The source's non-actor status reader consumes that object's own
            // sparse attribute, without inventing a body/native-health binding.
            Ok(entity
                .attributes
                .as_ref()
                .and_then(|a| a.get(attribute_id))
                .map(|a| a.value.clone()))
        }
    }

    fn field(&self, entity: &Entity, field: &str) -> Result<Option<StatusValue>, ValueError> {
        let actor = entity.actor.as_ref();
        Ok(match field {
            "controller" => actor.map(|actor| StatusValue::Text(actor.controller.clone())),
            "alive" => actor.map(|actor| StatusValue::Boolean(actor.alive)),
            "incapacitated" => actor.map(|actor| StatusValue::Boolean(actor.incapacitated)),
            "kind" => Some(StatusValue::Text(entity.kind.clone())),
            "grounded" => Some(StatusValue::Boolean(matches!(
                &entity.placement,
                Some(crate::state::Placement::World {
                    support_surface_id: Some(_),
                    ..
                })
            ))),
            "nativeResponseActive" => Some(StatusValue::Boolean(
                entity
                    .animal
                    .as_ref()
                    .is_some_and(|animal| animal.episode.is_some()),
            )),
            "activeWork" => Some(StatusValue::Boolean(
                actor.is_some_and(|actor| actor.action.is_some())
                    || !matches!(
                        &entity.placement,
                        Some(crate::state::Placement::World {
                            support_surface_id: Some(_),
                            ..
                        })
                    )
                    || entity
                        .animal
                        .as_ref()
                        .is_some_and(|animal| animal.episode.is_some()),
            )),
            "nativeForagingActive" | "controllerProfileId" => {
                // The scoped authored initializer genuinely has no ecology
                // state. A future live foraging family must implement its owner;
                // retained unconverted input must never masquerade as absence.
                if entity
                    .animal
                    .as_ref()
                    .is_some_and(|animal| animal.foraging.is_some())
                {
                    return Err(ValueError::InvalidMeaning);
                }
                Some(if field == "controllerProfileId" {
                    StatusValue::Text(String::new())
                } else {
                    StatusValue::Boolean(false)
                })
            }
            _ => return Err(ValueError::InvalidMeaning),
        })
    }

    fn comparison_value(
        &self,
        bindings: EffectBindings<'_>,
        comparison: &AttributeComparison,
    ) -> f64 {
        if comparison.unit.as_deref() != Some("fractionOfRange") {
            return comparison.value;
        }
        let entity = self.entities.get(bindings.target(comparison.target));
        let Some(definition) = self.attributes.get(&comparison.attribute) else {
            return comparison.value;
        };
        let Some(entity) = entity else {
            return comparison.value;
        };
        match attribute_range(Some(entity), definition) {
            Some((min, max)) => min + comparison.value * (max - min),
            None => comparison.value,
        }
    }

    pub fn local_hour(&self) -> f64 {
        let hour = (self.sim_time / 3600.0 + self.policy.clock_offset_hours) % 24.0;
        if hour < 0.0 { hour + 24.0 } else { hour }
    }

    /// The existing closed condition language, with the original left-to-right
    /// short circuit and missing-value behavior. This does not replay historical
    /// predicates to validate an already earned arithmetic interval.
    pub fn evaluate(
        &self,
        bindings: EffectBindings<'_>,
        condition: &StatusCondition,
    ) -> Result<ConditionEvaluation, ValueError> {
        let mut tests = 1;
        let matches = match condition {
            StatusCondition::All { all } => {
                let mut matches = true;
                for child in all {
                    let result = self.evaluate(bindings, child)?;
                    tests += result.tests;
                    if !result.matches {
                        matches = false;
                        break;
                    }
                }
                matches
            }
            StatusCondition::Any { any } => {
                let mut matches = false;
                for child in any {
                    let result = self.evaluate(bindings, child)?;
                    tests += result.tests;
                    if result.matches {
                        matches = true;
                        break;
                    }
                }
                matches
            }
            StatusCondition::Compare { compare } => {
                let left = self
                    .value(bindings.target(compare.target), &compare.attribute)?
                    .map(|value| match value {
                        AttributeValue::Number(number) => StatusValue::Number(number),
                        AttributeValue::Category(category) => StatusValue::Text(category),
                    });
                compare_status(
                    left.as_ref(),
                    compare.operator,
                    &StatusValue::Number(self.comparison_value(bindings, compare)),
                )
            }
            StatusCondition::Field { field } => {
                match self.entities.get(bindings.target(field.target)) {
                    Some(entity) => compare_status(
                        self.field(entity, &field.name)?.as_ref(),
                        field.operator,
                        &field.value,
                    ),
                    None => false,
                }
            }
            StatusCondition::Daily { daily_window } => {
                let hour = self.local_hour();
                if daily_window.start < daily_window.end {
                    hour >= daily_window.start && hour < daily_window.end
                } else {
                    hour >= daily_window.start || hour < daily_window.end
                }
            }
            StatusCondition::Has { has_attribute } => self
                .value(
                    bindings.target(has_attribute.target),
                    &has_attribute.attribute,
                )?
                .is_some(),
            StatusCondition::Active { status_active } => {
                match self.entities.get(bindings.target(status_active.target)) {
                    None => false,
                    Some(entity) => {
                        let active = entity
                            .status_effects
                            .as_ref()
                            .and_then(|s| s.get(&status_active.definition_id));
                        if active.is_some_and(|status| status.contribution.is_some()) {
                            return Err(ValueError::InvalidMeaning);
                        }
                        active.is_some_and(|status| status.active) == status_active.value
                    }
                }
            }
        };
        Ok(ConditionEvaluation { matches, tests })
    }
}
