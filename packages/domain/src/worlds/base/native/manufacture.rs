//! Verify the checked family result against the same rules as its Source
//! compiler. A generic recipe or item description grants no native effect.
use crate::install::{InstallError, ItemDefinitionRead};
use crate::manufacturing::{Candidate, FixedTransform, Input};
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LineRules {
    family_id: String,
    kind: String,
    work_seconds: f64,
    packing_load: u64,
    roles: Vec<Role>,
}
#[derive(Deserialize)]
struct Role {
    id: String,
    properties: Vec<String>,
    quantity: u64,
}

static LINE: LazyLock<LineRules> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../river-line-rules.json"))
        .expect("base line manufacture rules are a build input")
});

struct AuthoredSling {
    candidate: Candidate<'static>,
    parameters: SlingParameters,
}

static SLING: LazyLock<AuthoredSling> = LazyLock::new(|| {
    let candidate: Candidate<'static> =
        serde_json::from_str(include_str!("../field-sling-method.json"))
            .expect("base field sling method is a build input");
    let parameters = serde_json::from_str(candidate.parameters.get())
        .expect("base field sling parameters are a build input");
    AuthoredSling {
        candidate,
        parameters,
    }
});

pub(crate) enum Rules {
    RiverLine,
    FieldSling,
}

pub(crate) fn selected(profile: (&str, u64), family: &str) -> Option<Rules> {
    if profile != ("grounded-wilderness", 1) {
        return None;
    }
    if family == LINE.family_id {
        return Some(Rules::RiverLine);
    }
    (family == SLING.candidate.family.id).then_some(Rules::FieldSling)
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LineParameters {}

#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SlingParameters {
    work_seconds: f64,
    damage: f64,
    range: f64,
    accuracy: f64,
}

impl Rules {
    pub(crate) fn supports(&self, candidate: &Candidate<'_>) -> Result<bool, InstallError> {
        match self {
            Self::RiverLine => {
                serde_json::from_str::<LineParameters>(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
                Ok(true)
            }
            Self::FieldSling => {
                if !candidate.same_choices(&SLING.candidate) {
                    return Ok(false);
                }
                let received: SlingParameters = serde_json::from_str(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
                Ok(SLING.parameters == received)
            }
        }
    }

    /// Check the compiled manufacture result at installation. Sling release
    /// and injury are the responsibility of their separate world capabilities.
    pub(crate) fn validates<'a>(
        &self,
        work: f64,
        candidate: &Candidate<'_>,
        definition: impl Fn(&str) -> Option<&'a ItemDefinitionRead>,
        output: &ItemDefinitionRead,
        body: &str,
    ) -> Result<bool, InstallError> {
        match self {
            Self::RiverLine => Ok(LINE.validates(work, &candidate.inputs, definition, output)),
            Self::FieldSling => {
                #[derive(Deserialize)]
                #[serde(rename_all = "camelCase")]
                struct Tool<'a> {
                    #[serde(borrow)]
                    ranged_weapon: Ranged<'a>,
                }

                #[derive(Deserialize)]
                struct Ranged<'a> {
                    mechanism: &'a str,
                    damage: f64,
                    range: f64,
                    accuracy: f64,
                }

                let expected = &SLING.parameters;
                let installed: Tool<'_> =
                    serde_json::from_str(body).map_err(|_| InstallError::DefinitionBody)?;
                let ranged = installed.ranged_weapon;
                Ok(work == expected.work_seconds
                    && output.portable
                    && !output.is_container()
                    && output.equipment_ports().is_some()
                    && SLING.candidate.family.id.strip_prefix("base:") == Some(ranged.mechanism)
                    && expected.damage == ranged.damage
                    && expected.range == ranged.range
                    && expected.accuracy == ranged.accuracy)
            }
        }
    }
}

impl LineRules {
    fn validates<'a>(
        &self,
        work: f64,
        inputs: &[Input],
        definition: impl Fn(&str) -> Option<&'a ItemDefinitionRead>,
        output: &ItemDefinitionRead,
    ) -> bool {
        work == self.work_seconds
            && inputs.len() == self.roles.len()
            && self.roles.iter().all(|role| {
                inputs
                    .iter()
                    .find(|input| input.role == role.id)
                    .is_some_and(|input| {
                        input.quantity == role.quantity
                            && definition(&input.definition_id).is_some_and(|item| {
                                role.properties.iter().all(|property| {
                                    item.properties
                                        .iter()
                                        .any(|actual| actual == property.as_str())
                                })
                            })
                    })
            })
            && output.portable
            && !output.is_container()
            && output.fishing_kind() == Some(self.kind.as_str())
            && output.packing_load() == Some(self.packing_load)
            && output.properties.is_empty()
            && output.material.is_none()
    }
}

/// Only the checked Base cutting-stone transform is currently executable.
pub(crate) fn supports_fixed(
    profile: (&str, u64),
    candidate: &FixedTransform,
) -> Result<bool, InstallError> {
    const KNAPPING: &str = "base:knap-cutting-stone";
    if profile != ("grounded-wilderness", 1) || candidate.id != KNAPPING {
        return Ok(false);
    }
    static RECIPE: LazyLock<FixedTransform> = LazyLock::new(|| {
        #[derive(Deserialize)]
        struct Catalogue {
            methods: Vec<Method>,
        }
        #[derive(Deserialize)]
        struct Method {
            definition: Option<FixedTransform>,
        }
        let authored: Catalogue =
            serde_json::from_str(include_str!("../config/first-playable.generated.json"))
                .expect("Base manufacture catalogue is a build input");
        authored
            .methods
            .into_iter()
            .filter_map(|method| method.definition)
            .find(|recipe| recipe.id == KNAPPING)
            .expect("Base catalogue contains its cutting-stone recipe")
    });
    if &*RECIPE != candidate {
        return Err(InstallError::DefinitionBody);
    }
    Ok(true)
}
