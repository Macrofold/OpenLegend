//! One-time composition of immutable installed meanings. It pairs the complete
//! authored manifest with current SQL before any runtime can become authority;
//! there is no policy callback into a TypeScript world during execution.

use super::*;
use crate::native_response::{NativeResponseProfile, profile_key};
use crate::reception::{AcousticPolicy, SenseDefinition};
use crate::status::{AttributeDefinition, StatusCapabilities, StatusEffectPolicy};
use crate::values::{
    DefinitionPin, deserialize_nullable, deserialize_present_option, deserialize_safe_integer,
};
use crate::work::InstalledWorkPolicy;
use serde_json::Value;

#[derive(Debug, PartialEq, Deserialize)]
enum ManifestInterface {
    #[serde(rename = "world-modules-v1")]
    WorldModules,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifest {
    #[serde(default, deserialize_with = "deserialize_present_option")]
    appraisals: Option<Value>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    revision: u64,
    interface: ManifestInterface,
    #[serde(deserialize_with = "deserialize_nullable")]
    body_policy: Option<crate::body::BodyPolicy>,
    #[serde(deserialize_with = "deserialize_nullable")]
    body_policy_pin: Option<DefinitionPin>,
    definitions: Vec<AttributeDefinition>,
    pins: Vec<DefinitionPin>,
    senses: Vec<SenseDefinition>,
    default_senses: Vec<String>,
    sense_pins: Vec<DefinitionPin>,
    acoustics: AcousticPolicy,
    acoustics_pin: DefinitionPin,
    #[serde(deserialize_with = "deserialize_nullable")]
    ranged_policy: Option<Value>,
    #[serde(deserialize_with = "deserialize_nullable")]
    ranged_policy_pin: Option<DefinitionPin>,
    activity_hosts: Vec<DefinitionPin>,
    recipe_families: Vec<DefinitionPin>,
}

/// These are authored definitions only. The optional ranged family is retained
/// intact for static presentation/save; an unsupported live action still fails
/// installation/admission at the physical owner. No Value contains actors,
/// histories, mutable clocks or a generic runtime field dictionary.
pub(crate) struct AuthoredManifest {
    pub row: crate::records::InstalledRow,
    pub revision: u64,
    pub appraisals: Option<Arc<Value>>,
    pub ranged_policy: Option<Arc<Value>>,
    pub ranged_policy_pin: Option<DefinitionPin>,
    pub activity_hosts: Vec<DefinitionPin>,
    pub recipe_families: Vec<DefinitionPin>,
}

pub(crate) struct PhysicalMeanings {
    pub manifest: AuthoredManifest,
    pub attributes: IndexMap<String, VerifiedDefinition<AttributeDefinition>>,
    pub senses: IndexMap<String, VerifiedDefinition<SenseDefinition>>,
    pub default_senses: Vec<String>,
    pub acoustics: VerifiedDefinition<AcousticPolicy>,
    pub body_policy: Option<VerifiedDefinition<crate::body::BodyPolicy>>,
    pub response_profiles: IndexMap<String, VerifiedDefinition<NativeResponseProfile>>,
    pub status_policy: StatusEffectPolicy,
    pub capabilities: StatusCapabilities,
    pub status_policy_canonical: Arc<str>,
    pub status_work: IndexMap<String, crate::status::CompiledStatusWork>,
    pub population_work: crate::status::StatusInstallationWork,
    pub work_policy: Arc<InstalledWorkPolicy>,
}

pub(crate) struct PhysicalDefinitionInputs {
    pub manifest: CanonicalInput,
    pub attributes: Vec<DefinitionInput>,
    pub senses: Vec<DefinitionInput>,
    pub acoustics: DefinitionInput,
    pub body_policy: Option<DefinitionInput>,
    pub response_profiles: Vec<DefinitionInput>,
    pub status_policy: CanonicalInput,
    pub work_policy: CanonicalInput,
}

pub(crate) fn install_physical_meanings(
    import: &mut RowImport,
    manifest_present: bool,
    statuses_present: bool,
    profiles_present: bool,
    input: PhysicalDefinitionInputs,
    settings_work: crate::work::WorkPolicy,
) -> Result<PhysicalMeanings, InstallError> {
    let (manifest_row, manifest_value) = rows::take_one::<Value>(
        import,
        "world_manifest",
        "[\"world\"]",
        "moduleManifest",
        manifest_present,
    )?
    .ok_or(InstallError::ParentPresence)?;
    if !manifest_row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    input.manifest.verify_json(&manifest_value)?;
    let manifest: Manifest =
        serde_json::from_value(manifest_value).map_err(|_| InstallError::DefinitionBody)?;
    if manifest.revision == 0
        || manifest.definitions.len() != input.attributes.len()
        || manifest.definitions.len() != manifest.pins.len()
        || manifest.senses.len() != input.senses.len()
        || manifest.senses.len() != manifest.sense_pins.len()
        || manifest.ranged_policy.is_some() != manifest.ranged_policy_pin.is_some()
        || manifest.body_policy.is_some() != manifest.body_policy_pin.is_some()
    {
        return Err(InstallError::DefinitionBody);
    }
    let mut attributes = IndexMap::with_capacity(manifest.definitions.len());
    for ((definition, pin), input) in manifest
        .definitions
        .into_iter()
        .zip(manifest.pins)
        .zip(input.attributes)
    {
        if input.pin != pin {
            return Err(InstallError::DefinitionPin);
        }
        let definition = input.verify(definition)?;
        if attributes
            .insert(definition.pin().id.clone(), definition)
            .is_some()
        {
            return Err(InstallError::DefinitionCollision);
        }
    }
    let mut senses = IndexMap::with_capacity(manifest.senses.len());
    for ((definition, pin), input) in manifest
        .senses
        .into_iter()
        .zip(manifest.sense_pins)
        .zip(input.senses)
    {
        if input.pin != pin {
            return Err(InstallError::DefinitionPin);
        }
        let definition = input.verify(definition)?;
        if senses
            .insert(definition.pin().id.clone(), definition)
            .is_some()
        {
            return Err(InstallError::DefinitionCollision);
        }
    }
    if manifest
        .default_senses
        .iter()
        .any(|id| !senses.contains_key(id))
        || input.acoustics.pin != manifest.acoustics_pin
    {
        return Err(InstallError::DefinitionPin);
    }
    let acoustics = input.acoustics.verify(manifest.acoustics)?;
    let body_policy = match (
        manifest.body_policy,
        manifest.body_policy_pin,
        input.body_policy,
    ) {
        (None, None, None) => None,
        (Some(value), Some(pin), Some(input)) if input.pin == pin => Some(input.verify(value)?),
        _ => return Err(InstallError::DefinitionPin),
    };
    let profiles = rows::take_collection(
        import,
        "config_native_response_profiles",
        "[\"world\"]",
        profiles_present,
        true,
    )?;
    if profiles.rows.len() != input.response_profiles.len() {
        return Err(InstallError::DefinitionBody);
    }
    let mut profile_inputs = IndexMap::with_capacity(input.response_profiles.len());
    for input in input.response_profiles {
        let key = profile_key(&input.pin).map_err(|_| InstallError::DefinitionPin)?;
        if profile_inputs.insert(key, input).is_some() {
            return Err(InstallError::DefinitionCollision);
        }
    }
    let mut response_profiles = IndexMap::with_capacity(profiles.rows.len());
    for row in profiles.rows {
        rows::validate_map_row(
            &row,
            "[\"world\"]",
            "nativeResponseProfiles",
            &row.slot,
            profiles.coverage.next_ordinal,
        )?;
        if !row.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        let value: NativeResponseProfile =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::DefinitionBody)?;
        let input = profile_inputs
            .shift_remove(&row.slot)
            .ok_or(InstallError::DefinitionPin)?;
        if response_profiles
            .insert(row.slot, input.verify(value)?)
            .is_some()
        {
            return Err(InstallError::DefinitionCollision);
        }
    }
    if !profile_inputs.is_empty() {
        return Err(InstallError::DefinitionBody);
    }
    let (status_row, status_policy) = rows::take_one::<StatusEffectPolicy>(
        import,
        "config_status_effects",
        "[\"world\"]",
        "statusEffectPolicy",
        statuses_present,
    )?
    .ok_or(InstallError::ParentPresence)?;
    if !status_row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    input.status_policy.verify(&status_policy)?;
    // Work invocation identity uses Source canonicalJson(definition), while
    // the stored policy preserves its authored property order. JSON key order
    // changes the pin even when all current values and byte counts agree.
    let status_work =
        crate::status::compile_status_work(&status_policy, &input.status_policy.canonical)?;
    let population_work = crate::status::compile_status_installation(
        &manifest_row.payload,
        &status_policy,
        &status_work,
        body_policy.as_ref().map(VerifiedDefinition::value),
    )?;
    let capabilities = StatusCapabilities::compile(&status_policy);
    let work_policy = Arc::new(
        InstalledWorkPolicy::verify(
            input.work_policy.canonical,
            input.work_policy.sha256,
            settings_work,
        )
        .map_err(|_| InstallError::DefinitionBody)?,
    );
    Ok(PhysicalMeanings {
        manifest: AuthoredManifest {
            row: manifest_row,
            revision: manifest.revision,
            appraisals: manifest.appraisals.map(Arc::new),
            ranged_policy: manifest.ranged_policy.map(Arc::new),
            ranged_policy_pin: manifest.ranged_policy_pin,
            activity_hosts: manifest.activity_hosts,
            recipe_families: manifest.recipe_families,
        },
        attributes,
        senses,
        default_senses: manifest.default_senses,
        acoustics,
        body_policy,
        response_profiles,
        status_policy,
        capabilities,
        status_policy_canonical: Arc::from(input.status_policy.canonical),
        status_work,
        population_work,
        work_policy,
    })
}
