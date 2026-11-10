//! One finite immutable setup product for the existing server formatters and
//! physical providers. It borrows actual installed definitions/rows, never an
//! actor, historical account, mutable header or writable WorldState adapter.

use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::install::{RetainedMap, RetainedOne};
use crate::simulation::InstalledWorld;
use serde::{Serialize, Serializer, ser::SerializeMap};
use serde_json::value::RawValue;

/// The install owner already validated this complete encoded value. Borrowing
/// RawValue is the safe serializer entry point; no body is cloned, decoded into
/// a Value tree or normalized (including quoted isolated UTF-16 code units).
struct Encoded<'a>(&'a str);
impl Serialize for Encoded<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let value: &RawValue = serde_json::from_str(self.0).map_err(serde::ser::Error::custom)?;
        value.serialize(serializer)
    }
}
struct One<'a>(&'a RetainedOne);
impl Serialize for One<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        Encoded(self.0.payload()).serialize(serializer)
    }
}
struct Map<'a>(&'a RetainedMap);
impl Serialize for Map<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(self.0.len()))?;
        for (key, payload) in self.0.entries() {
            map.serialize_entry(key, &Encoded(payload))?;
        }
        map.end()
    }
}
/// Only immutable wording fields consumed by the offered-action formatter.
pub(super) fn choice_description_definitions(installed: &InstalledWorld) -> impl Serialize + '_ {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ChoiceDefinitions<'a> {
        status_effect_policy: &'a crate::status::StatusEffectPolicy,
        #[serde(skip_serializing_if = "Option::is_none")]
        native_strikes: Option<Map<'a>>,
        probes: &'a [crate::worlds::base_decision_offers::ProbeOffer],
    }
    ChoiceDefinitions {
        status_effect_policy: &installed.status_policy,
        native_strikes: installed.retained.native_strikes.as_ref().map(Map),
        probes: &installed.occurrence_rules.value().response.offers.probes,
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Definitions<'a> {
    profile: &'a crate::install::WorldProfile,
    #[serde(skip_serializing_if = "Option::is_none")]
    presentation: Option<&'a RawValue>,
    module_manifest: Encoded<'a>,
    status_effect_policy: &'a crate::status::StatusEffectPolicy,
    cognition_policy: &'a crate::experience::CognitionPolicy,
    item_definitions: Map<'a>,
    item_handling: One<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    construction_profile: Option<One<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    participation_policy: Option<One<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    native_strikes: Option<Map<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    knowledge_policy: Option<One<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    daily_rain_definitions: Option<Map<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    work_batch_policy: Option<One<'a>>,
    invention_policy: One<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    assembly_families: Option<Map<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    hearth_definitions: Option<Map<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    native_foraging_profiles: Option<Map<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    gathering_policy: Option<One<'a>>,
    food_preparations: Map<'a>,
    cast_definitions: Map<'a>,
    recipes: Map<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Policies<'a> {
    attention: Encoded<'a>,
    prepared_responses: Encoded<'a>,
    account_rules: Encoded<'a>,
    name_rules: Encoded<'a>,
    recognition: Encoded<'a>,
    occurrence_rules: Encoded<'a>,
    speech_action: Encoded<'a>,
    ordinary_actions: Encoded<'a>,
    observation_rules: Encoded<'a>,
    event_appraisal_rules: Encoded<'a>,
    promises: Encoded<'a>,
    event_disclosure: Encoded<'a>,
    detection_support: Encoded<'a>,
    movement: Encoded<'a>,
    time_rules: Encoded<'a>,
    work: Encoded<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Settings<'a> {
    actor_response: &'a crate::response::ResponseLimits,
    spatial: &'a crate::install::SpatialSettings,
    movement: &'a crate::install::MovementSettings,
    personal_evidence_preparation: &'a crate::install::PersonalEvidencePreparationSettings,
    mind: &'a crate::cognition::MindLimits,
    agency: &'a crate::plans::AgencyLimits,
    maximum_change_scopes: usize,
    encounter_batch_entries: usize,
    time_epsilon: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    definitions: Definitions<'a>,
    geometry: &'a crate::geometry::GeometryMap,
    native_policies: Policies<'a>,
    settings: Settings<'a>,
}
pub(crate) fn write_installed_definitions(
    installed: &InstalledWorld,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let retained = &installed.retained;
    let product = Product {
        definitions: Definitions {
            profile: &installed.content.profile,
            presentation: installed.content.presentation.as_deref(),
            module_manifest: Encoded(&installed.manifest.row.payload),
            status_effect_policy: &installed.status_policy,
            cognition_policy: &installed.cognition,
            item_definitions: Map(&retained.item_definitions),
            item_handling: One(&retained.item_handling),
            construction_profile: retained.construction_profile.as_ref().map(One),
            participation_policy: retained.participation_policy.as_ref().map(One),
            native_strikes: retained.native_strikes.as_ref().map(Map),
            knowledge_policy: retained.knowledge_policy.as_ref().map(One),
            daily_rain_definitions: retained.daily_rain_definitions.as_ref().map(Map),
            work_batch_policy: retained.work_batch_policy.as_ref().map(One),
            invention_policy: One(&retained.invention_policy),
            assembly_families: retained.assembly_families.as_ref().map(Map),
            hearth_definitions: retained.hearth_definitions.as_ref().map(Map),
            native_foraging_profiles: retained.native_foraging_profiles.as_ref().map(Map),
            gathering_policy: retained.gathering_policy.as_ref().map(One),
            food_preparations: Map(&retained.food_preparations),
            cast_definitions: Map(&retained.cast_definitions),
            recipes: Map(&retained.recipes),
        },
        geometry: &installed.geometry,
        native_policies: Policies {
            attention: Encoded(installed.attention.source()),
            prepared_responses: Encoded(installed.prepared_responses.source()),
            account_rules: Encoded(installed.account_rules.source()),
            name_rules: Encoded(installed.name_rules.source()),
            recognition: Encoded(installed.recognition.source()),
            occurrence_rules: Encoded(installed.occurrence_rules.source()),
            speech_action: Encoded(installed.speech_action.source()),
            ordinary_actions: Encoded(installed.ordinary_actions.source()),
            observation_rules: Encoded(installed.observation_rules.source()),
            event_appraisal_rules: Encoded(installed.event_appraisal_rules.source()),
            promises: Encoded(installed.promises.source()),
            event_disclosure: Encoded(installed.event_disclosure.source()),
            detection_support: Encoded(installed.detection_support.source()),
            movement: Encoded(installed.movement.canonical()),
            time_rules: Encoded(installed.time_rules.canonical()),
            work: Encoded(installed.work_policy.canonical()),
        },
        settings: Settings {
            actor_response: &installed.actor_response_limits,
            spatial: &installed.spatial,
            movement: &installed.movement_settings,
            personal_evidence_preparation: &installed.personal_evidence_preparation,
            mind: &installed.mind_limits,
            agency: &installed.agency_limits,
            maximum_change_scopes: installed.maximum_change_scopes,
            encounter_batch_entries: installed.encounter_batch_entries,
            time_epsilon: installed.time_epsilon,
        },
    };
    let length =
        crate::encoding::json_record_len(&product).map_err(|_| ExecutionError::Invariant)?;
    // The writer's growth and final single String overlap only within this
    // funded owner; the returned guard follows detached wire/decoded custody.
    let mut storage = budget.reserve(
        length
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?
            .max(8),
    )?;
    let json = crate::encoding::json_record(&product).map_err(|_| ExecutionError::Invariant)?;
    storage.resize(json.capacity())?;
    Ok((json, storage))
}
