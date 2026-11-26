//! Verify the checked family result against the same rules as its Source
//! compiler. A generic recipe or item description grants no native effect.
use crate::install::{InstallError, ItemDefinitionRead};
use crate::manufacturing::{Candidate, FixedTransform, Input};
use crate::text::JsText;
use crate::values::DefinitionPin;
use serde::Deserialize;
use std::sync::LazyLock;

#[path = "manufactured_armament.rs"]
mod armament;
use armament::Armament;

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

const GATHERING_FAMILY: &str = "base:gathering-tool";
const WOVEN_FAMILY: &str = "base:woven-container";
const RETAINED_FIXED_TRANSFORMS: [&str; 4] = [
    "base:clean-fibers",
    "base:knap-cutting-stone",
    "base:trim-club",
    "base:twist-cord",
];

struct AuthoredMethods {
    fixed: Vec<FixedTransform>,
    gathering: Vec<(Candidate<'static>, GatheringParameters)>,
    woven: Vec<(Candidate<'static>, WovenParameters)>,
}

static AUTHORED: LazyLock<AuthoredMethods> = LazyLock::new(|| {
    #[derive(Deserialize)]
    struct Catalogue<'a> {
        #[serde(borrow)]
        methods: Vec<Row<'a>>,
    }
    #[derive(Deserialize)]
    struct Row<'a> {
        definition: Option<FixedTransform>,
        #[serde(borrow)]
        candidate: Option<Candidate<'a>>,
    }
    let source: Catalogue<'static> =
        serde_json::from_str(include_str!("../config/first-playable.generated.json"))
            .expect("Base manufacture catalogue is a build input");
    let mut fixed = Vec::new();
    let mut gathering = Vec::new();
    let pouch: Candidate<'static> =
        serde_json::from_str(include_str!("../config/woven-pouch-method.json"))
            .expect("Base woven pouch method is a build input");
    let mut woven = vec![(
        pouch,
        WovenParameters {
            contents_exposure_profile: None,
        },
    )];
    for row in source.methods {
        if let Some(recipe) = row.definition
            && RETAINED_FIXED_TRANSFORMS.contains(&recipe.id.as_str())
        {
            fixed.push(recipe);
        }
        if let Some(candidate) = row.candidate {
            if candidate.family.id == GATHERING_FAMILY {
                let parameters = serde_json::from_str(candidate.parameters.get())
                    .expect("Base uses a valid finite gathering tool");
                gathering.push((candidate, parameters));
            } else if candidate.family.id == WOVEN_FAMILY {
                let parameters = serde_json::from_str(candidate.parameters.get())
                    .expect("Base uses a valid finite woven container");
                woven.push((candidate, parameters));
            }
        }
    }
    assert_eq!(
        fixed.len(),
        RETAINED_FIXED_TRANSFORMS.len(),
        "missing retained Base transform"
    );
    AuthoredMethods {
        fixed,
        gathering,
        woven,
    }
});

#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GatheringParameters {
    work_seconds: f64,
    resource_id: String,
    quantity: u64,
}

#[derive(Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
struct StoryFields {
    story_importance: StoryWeight,
}

#[derive(Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
struct StoryWeight {
    story_importance: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OutputRules {
    excluded_inherited_properties: Vec<String>,
    gathering_tool_ports: Vec<String>,
    constructed_story_fields: StoryFields,
}

static OUTPUTS: LazyLock<OutputRules> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../config/recipe-output-rules.json"))
        .expect("Base manufacture output rules are a build input")
});

#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WovenParameters {
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    contents_exposure_profile: Option<DefinitionPin>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WovenRules {
    minimum_pouch_quantity: u64,
    maximum_pouch_quantity: u64,
    binding_divisor: u64,
    capacity_per_pouch_unit: u64,
    empty_packing_load_divisor: u64,
    work_seconds_per_material: u64,
    output_quantity: u64,
    maximum_depth: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WovenConfig {
    rules: WovenRules,
    pouch_properties: Vec<JsText>,
    binding_properties: Vec<JsText>,
    product_properties: Vec<JsText>,
}

static WOVEN: LazyLock<WovenConfig> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../config/woven-container-rules.json"))
        .expect("Base woven container rules are a build input")
});

pub(crate) enum Rules {
    RiverLine,
    FieldSling,
    GatheringTool,
    WovenContainer,
    Armament(Armament),
}

pub(crate) fn selected(profile: (&str, u64), family: &str) -> Option<Rules> {
    if profile != ("grounded-wilderness", 1) {
        return None;
    }
    if family == LINE.family_id {
        return Some(Rules::RiverLine);
    }
    match family {
        GATHERING_FAMILY => Some(Rules::GatheringTool),
        WOVEN_FAMILY => Some(Rules::WovenContainer),
        family if family == SLING.candidate.family.id => Some(Rules::FieldSling),
        family => Armament::selected(family).map(Rules::Armament),
    }
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
            Self::Armament(arms) => arms.supports(candidate),
            Self::RiverLine => {
                serde_json::from_str::<LineParameters>(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
                Ok(true)
            }
            Self::GatheringTool => {
                let parameters: GatheringParameters =
                    serde_json::from_str(candidate.parameters.get())
                        .map_err(|_| InstallError::DefinitionBody)?;
                Ok(AUTHORED.gathering.iter().any(|(authored, expected)| {
                    candidate.same_choices(authored) && &parameters == expected
                }))
            }
            Self::WovenContainer => {
                let parameters: WovenParameters = serde_json::from_str(candidate.parameters.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
                Ok(AUTHORED.woven.iter().any(|(authored, expected)| {
                    candidate.same_choices(authored) && &parameters == expected
                }))
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
        item_defaults: (bool, Option<u64>),
    ) -> Result<bool, InstallError> {
        match self {
            Self::Armament(arms) => {
                arms.validates(work, candidate, definition, output, body, item_defaults)
            }
            Self::RiverLine => Ok(LINE.validates(work, &candidate.inputs, definition, output)),
            Self::GatheringTool => {
                gathering_product(work, candidate, definition, output, body, item_defaults)
            }
            Self::WovenContainer => woven_product(work, candidate, definition, output, body),
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

/// The retained Base transforms use their ordinary authored recipe
/// records. Construction transforms keep their separate support boundary.
pub(crate) fn supports_fixed(
    profile: (&str, u64),
    candidate: &FixedTransform,
) -> Result<bool, InstallError> {
    if profile != ("grounded-wilderness", 1)
        || !RETAINED_FIXED_TRANSFORMS.contains(&candidate.id.as_str())
    {
        return Ok(false);
    }
    let authored = AUTHORED
        .fixed
        .iter()
        .find(|recipe| recipe.id == candidate.id)
        .expect("Base catalogue contains its retained transforms");
    if authored != candidate {
        return Err(InstallError::DefinitionBody);
    }
    Ok(true)
}

/// Validate only the compiled result of the exact authored tools. Besides
/// the shared item fields, this closed output shape prevents an unrelated
/// weapon, food, container or material capability entering through this family.
fn gathering_product<'a>(
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
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Product<'a> {
        #[serde(borrow)]
        equipment: Equipment<'a>,
        mechanism_fields: StoryFields,
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
        #[serde(rename = "gatheringTool")]
        _gathering_tool: IgnoredAny,
        #[serde(rename = "recipeId")]
        _recipe_id: IgnoredAny,
        #[serde(rename = "recipeRecord")]
        _recipe_record: Option<IgnoredAny>,
    }
    let product: Product<'_> =
        serde_json::from_str(body).map_err(|_| InstallError::DefinitionBody)?;
    let Some((_, rules)) = AUTHORED
        .gathering
        .iter()
        .find(|(expected, _)| candidate.same_choices(expected))
    else {
        return Ok(false);
    };
    Ok(work == rules.work_seconds
        && definition(&rules.resource_id).is_some_and(|resource| resource.recipe_id.is_none())
        && output.gathering_tool_yield() == Some((rules.resource_id.as_str(), rules.quantity))
        && &output.named.name == candidate.output_name()
        && output.portable == portable
        && output.packing_load() == packing_load
        && output.equipment_ports() == Some(OUTPUTS.gathering_tool_ports.as_slice())
        && product.equipment.uses == ["gather"]
        && product.mechanism_fields == OUTPUTS.constructed_story_fields
        && matches_inherited_properties(candidate, definition, &output.properties, None))
}

/// Check the portable item produced by the exact authored methods. Capacity
/// and exposure remain the existing item and inventory owners' state.
fn woven_product<'a>(
    work: f64,
    candidate: &Candidate<'_>,
    definition: impl Fn(&str) -> Option<&'a ItemDefinitionRead>,
    output: &ItemDefinitionRead,
    body: &str,
) -> Result<bool, InstallError> {
    use serde::de::IgnoredAny;
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct ContentsExposure {
        profile: DefinitionPin,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Product {
        mechanism_fields: StoryFields,
        #[serde(
            default,
            deserialize_with = "crate::values::deserialize_present_option"
        )]
        contents_exposure: Option<ContentsExposure>,
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
        _packing_load: IgnoredAny,
        #[serde(rename = "container")]
        _container: IgnoredAny,
        #[serde(rename = "characteristics")]
        _characteristics: IgnoredAny,
        #[serde(rename = "recipeId")]
        _recipe_id: IgnoredAny,
        #[serde(rename = "recipeRecord")]
        _recipe_record: Option<IgnoredAny>,
    }
    let product: Product = serde_json::from_str(body).map_err(|_| InstallError::DefinitionBody)?;
    let Some((_, parameters)) = AUTHORED
        .woven
        .iter()
        .find(|(expected, _)| candidate.same_choices(expected))
    else {
        return Ok(false);
    };
    let Some(pouch) = candidate.inputs.iter().find(|input| input.role == "pouch") else {
        return Ok(false);
    };
    let Some(binding) = candidate
        .inputs
        .iter()
        .find(|input| input.role == "binding")
    else {
        return Ok(false);
    };
    let woven = &*WOVEN;
    let rules = &woven.rules;
    let material_valid = |input: &Input, properties: &[JsText]| {
        definition(&input.definition_id).is_some_and(|material| {
            material.recipe_id.is_none()
                && material.nutrition.is_none()
                && properties
                    .iter()
                    .all(|property| material.properties.contains(property))
        })
    };
    let quantity = pouch.quantity;
    Ok(rules.output_quantity == 1
        && (rules.minimum_pouch_quantity..=rules.maximum_pouch_quantity).contains(&quantity)
        && binding.quantity == quantity.div_ceil(rules.binding_divisor)
        && material_valid(pouch, &woven.pouch_properties)
        && material_valid(binding, &woven.binding_properties)
        && work == (rules.work_seconds_per_material * (quantity + binding.quantity)) as f64
        && &output.named.name == candidate.output_name()
        && output.portable
        && output.properties == woven.product_properties
        && output.packing_load() == Some(quantity.div_ceil(rules.empty_packing_load_divisor))
        && output.container_capacity() == Some(rules.capacity_per_pouch_unit * quantity)
        && output.container_maximum_depth() == Some(rules.maximum_depth)
        && output.has_open_contents() == parameters.contents_exposure_profile.is_some()
        && product
            .contents_exposure
            .map(|exposure| exposure.profile)
            .as_ref()
            == parameters.contents_exposure_profile.as_ref()
        && product.mechanism_fields == OUTPUTS.constructed_story_fields)
}

/// The compiler and verifier agree about the set, including strict order and
/// any authored property the finished consumer adds independently of materials.
fn matches_inherited_properties<'a>(
    candidate: &Candidate<'_>,
    definition: impl Fn(&str) -> Option<&'a ItemDefinitionRead>,
    properties: &[JsText],
    included: Option<&str>,
) -> bool {
    let inherited = |property: &JsText| {
        !OUTPUTS
            .excluded_inherited_properties
            .iter()
            .any(|excluded| property == excluded.as_str())
    };
    properties.windows(2).all(|pair| pair[0] < pair[1])
        && included.is_none_or(|required| properties.iter().any(|property| property == required))
        && properties.iter().all(|property| {
            included.is_some_and(|required| property == required)
                || inherited(property)
                    && candidate.inputs.iter().any(|input| {
                        definition(&input.definition_id)
                            .is_some_and(|material| material.properties.contains(property))
                    })
        })
        && candidate.inputs.iter().all(|input| {
            definition(&input.definition_id).is_some_and(|material| {
                material
                    .properties
                    .iter()
                    .filter(|property| inherited(property))
                    .all(|property| properties.binary_search(property).is_ok())
            })
        })
}
