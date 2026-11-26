//! Exact authored shield, bow and projectile products. The common
//! manufacture path still owns every debit, work interval and receipt.

use super::{
    Candidate, InstallError, ItemDefinitionRead, JsText, LazyLock, OUTPUTS, SlingParameters,
    StoryFields, matches_inherited_properties,
};
use crate::attack_execution::AttackExecutionProfile;
use serde::Deserialize;

#[derive(Clone, Copy)]
pub(crate) enum Armament {
    Shield,
    Bow,
    Arrow,
}

#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GuardParameters {
    reduction: f64,
    coverage_degrees: f64,
}

#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ArrowParameters {
    work_seconds: f64,
    damage_bonus: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GuardWords {
    preparation_seconds: f64,
    ready_seconds: f64,
    recovery_seconds: f64,
    label: String,
    preparing_label: String,
    ready_label: String,
    recovery_label: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AuthoredArmament<'a> {
    #[serde(borrow)]
    shield_candidate: Candidate<'a>,
    #[serde(borrow)]
    bow_candidate: Candidate<'a>,
    #[serde(borrow)]
    arrow_candidate: Candidate<'a>,
    shield_work_seconds: f64,
    shield_packing_load: u64,
    guard: GuardWords,
    shield_ports: Vec<String>,
    ranged_ports: Vec<String>,
    arrow_flight_speed: f64,
    bow_recovery_seconds: f64,
    bow_execution: AttackExecutionProfile,
}

static ARMS: LazyLock<AuthoredArmament<'static>> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../config/armament-manufacture.json"))
        .expect("Base held equipment manufacture rules are a build input")
});

impl Armament {
    pub(super) fn selected(family: &str) -> Option<Self> {
        [Self::Shield, Self::Bow, Self::Arrow]
            .into_iter()
            .find(|kind| kind.candidate().family.id == family)
    }

    fn candidate(self) -> &'static Candidate<'static> {
        match self {
            Self::Shield => &ARMS.shield_candidate,
            Self::Bow => &ARMS.bow_candidate,
            Self::Arrow => &ARMS.arrow_candidate,
        }
    }

    pub(super) fn supports(self, candidate: &Candidate<'_>) -> Result<bool, InstallError> {
        let expected = self.candidate();
        if !candidate.same_choices(expected) {
            return Ok(false);
        }
        fn parameters_equal<T: serde::de::DeserializeOwned + PartialEq>(
            actual: &Candidate<'_>,
            expected: &Candidate<'_>,
        ) -> Result<bool, InstallError> {
            let decode = |candidate: &Candidate<'_>| {
                serde_json::from_str::<T>(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)
            };
            Ok(decode(actual)? == decode(expected)?)
        }
        match self {
            Self::Shield => parameters_equal::<GuardParameters>(candidate, expected),
            Self::Bow => parameters_equal::<SlingParameters>(candidate, expected),
            Self::Arrow => parameters_equal::<ArrowParameters>(candidate, expected),
        }
    }

    /// Finite existing manufacture results only. Reject extra capability
    /// fields and compare the profile already owned by guard/projectile code.
    pub(super) fn validates<'a>(
        self,
        work: f64,
        candidate: &Candidate<'_>,
        definition: impl Fn(&str) -> Option<&'a ItemDefinitionRead>,
        output: &ItemDefinitionRead,
        body: &str,
        (portable, packing_load): (bool, Option<u64>),
    ) -> Result<bool, InstallError> {
        use serde::de::IgnoredAny;
        #[derive(Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Equipment<'a> {
            #[serde(borrow)]
            uses: [&'a str; 1],
            #[serde(rename = "ports")]
            _ports: IgnoredAny,
        }
        #[derive(Deserialize)]
        struct Ranged<'a> {
            mechanism: &'a str,
        }
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase", deny_unknown_fields)]
        struct Product<'a> {
            #[serde(borrow)]
            equipment: Option<Equipment<'a>>,
            #[serde(borrow)]
            ranged_weapon: Option<Ranged<'a>>,
            mechanism_fields: Option<StoryFields>,
            #[serde(rename = "contactDefense")]
            _contact_defense: Option<IgnoredAny>,
            #[serde(rename = "ammunition")]
            _ammunition: Option<IgnoredAny>,
            #[serde(rename = "execution")]
            _execution: Option<IgnoredAny>,
            #[serde(rename = "id")]
            _id: IgnoredAny,
            #[serde(rename = "version")]
            _version: IgnoredAny,
            #[serde(rename = "name")]
            _name: IgnoredAny,
            #[serde(rename = "description")]
            _description: IgnoredAny,
            #[serde(rename = "properties")]
            _properties: IgnoredAny,
            #[serde(rename = "portable")]
            _portable: IgnoredAny,
            #[serde(rename = "packingLoad")]
            _packing_load: Option<IgnoredAny>,
            #[serde(rename = "recipeId")]
            _recipe_id: IgnoredAny,
            #[serde(rename = "recipeRecord")]
            _recipe_record: Option<IgnoredAny>,
        }
        let product: Product<'_> =
            serde_json::from_str(body).map_err(|_| InstallError::DefinitionBody)?;
        if &output.named.name != candidate.output_name()
            || !candidate.inputs.iter().all(|input| {
                definition(&input.definition_id).is_some_and(|material| {
                    material.recipe_id.is_none() && material.nutrition.is_none()
                })
            })
        {
            return Ok(false);
        }
        let has_equipment = |ports: &[String], use_name: &str| {
            output.equipment_ports() == Some(ports)
                && product
                    .equipment
                    .as_ref()
                    .is_some_and(|equipment| equipment.uses == [use_name])
        };
        let has_story =
            product.mechanism_fields.as_ref() == Some(&OUTPUTS.constructed_story_fields);
        match self {
            Self::Shield => {
                let values: GuardParameters = serde_json::from_str(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
                let guard = &ARMS.guard;
                Ok(work == ARMS.shield_work_seconds
                    && output.portable
                    && output.packing_load() == Some(ARMS.shield_packing_load)
                    && output
                        .properties
                        .iter()
                        .map(JsText::as_unicode)
                        .eq([Some("rigid"), Some("binding")])
                    && has_equipment(&ARMS.shield_ports, "guard")
                    && output.ranged_weapon.is_none()
                    && output.ammunition.is_none()
                    && output.execution.is_none()
                    && product.mechanism_fields.is_none()
                    && output.contact_defense.as_ref().is_some_and(|profile| {
                        profile.reduction == values.reduction
                            && profile.coverage_degrees == values.coverage_degrees
                            && profile.preparation_seconds == guard.preparation_seconds
                            && profile.ready_seconds == guard.ready_seconds
                            && profile.recovery_seconds == guard.recovery_seconds
                            && profile.label == guard.label
                            && profile.preparing_label == guard.preparing_label
                            && profile.ready_label == guard.ready_label
                            && profile.recovery_label == guard.recovery_label
                    }))
            }
            Self::Bow => {
                let values: SlingParameters = serde_json::from_str(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
                Ok(work == values.work_seconds
                    && output.portable == portable
                    && output.packing_load() == packing_load
                    && has_story
                    && matches_inherited_properties(
                        candidate,
                        definition,
                        &output.properties,
                        None,
                    )
                    && has_equipment(&ARMS.ranged_ports, "ranged")
                    && output.contact_defense.is_none()
                    && output.ammunition.is_none()
                    && output.execution.as_deref() == Some(&ARMS.bow_execution)
                    && product
                        .ranged_weapon
                        .is_some_and(|ranged| ranged.mechanism == "flex")
                    && output.ranged_weapon.as_ref().is_some_and(|weapon| {
                        weapon.ammunition_kind == "arrow"
                            && weapon.damage == values.damage
                            && weapon.range == values.range
                            && weapon.accuracy == values.accuracy
                            && weapon.flight_speed == ARMS.arrow_flight_speed
                            && weapon.recovery_seconds == ARMS.bow_recovery_seconds
                    }))
            }
            Self::Arrow => {
                let values: ArrowParameters = serde_json::from_str(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
                Ok(work == values.work_seconds
                    && output.portable == portable
                    && output.packing_load() == packing_load
                    && has_story
                    && matches_inherited_properties(
                        candidate,
                        definition,
                        &output.properties,
                        Some("projectile"),
                    )
                    && output.equipment_ports().is_none()
                    && output.ranged_weapon.is_none()
                    && output.contact_defense.is_none()
                    && output.execution.is_none()
                    && output.ammunition.as_ref().is_some_and(|ammo| {
                        ammo.kind == "arrow" && ammo.damage_bonus == values.damage_bonus
                    }))
            }
        }
    }
}
