//! One-time composition of immutable installed meanings. It pairs the complete
//! authored manifest with current SQL before any runtime can become authority;
//! there is no policy callback into a TypeScript world during execution.

use super::*;
use crate::host::ResidentReservation;
use crate::host::retained_size::{HeapBytes, fresh_json_bytes, heap_sum, map_storage};
use crate::native_response::{NativeResponseProfile, profile_key, profile_key_len};
use crate::reception::{AcousticPolicy, SenseDefinition};
use crate::status::{
    AttributeDefinition, CompiledStatusWorkMap, InstalledStatusPolicy, StatusCapabilities,
};
use crate::values::{
    DefinitionPin, deserialize_nullable, deserialize_present_option, deserialize_safe_integer,
};
use crate::work::InstalledWorkPolicy;
use serde_json::Value;
use std::mem::{align_of, size_of};

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
    _storage: ResidentReservation,
}

pub(crate) struct PhysicalMeanings {
    pub manifest: AuthoredManifest,
    pub attributes: IndexMap<String, VerifiedDefinition<AttributeDefinition>>,
    pub senses: IndexMap<String, VerifiedDefinition<SenseDefinition>>,
    pub default_senses: Vec<String>,
    pub acoustics: VerifiedDefinition<AcousticPolicy>,
    pub body_policy: Option<VerifiedDefinition<crate::body::BodyPolicy>>,
    pub response_profiles: IndexMap<String, VerifiedDefinition<NativeResponseProfile>>,
    pub status_policy: InstalledStatusPolicy,
    pub capabilities: StatusCapabilities,
    pub status_work: CompiledStatusWorkMap,
    pub population_work: crate::status::StatusInstallationWork,
    pub work_policy: Arc<InstalledWorkPolicy>,
    pub storage: ResidentReservation,
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
    budget: &crate::host::ByteBudget,
) -> Result<PhysicalMeanings, InstallError> {
    let manifest_row = rows::take_one_row(
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
    let json_layout = Some(size_of::<(usize, String, Value)>());
    let _json = reserve_typed_parse::<Value>(
        &manifest_row.payload,
        size_of::<Value>(),
        json_layout,
        budget,
    )?;
    let manifest_value: Value =
        serde_json::from_str(&manifest_row.payload).map_err(|_| InstallError::DefinitionBody)?;
    {
        let _canonical = reserve_typed_parse::<Value>(
            &input.manifest.canonical,
            size_of::<Value>(),
            json_layout,
            budget,
        )?;
        input.manifest.verify_json(&manifest_value)?;
    }
    // The manifest embeds complete attributes/body/sense definitions. Its
    // construction allowance follows these actual moved fields into their
    // immutable records; no field is decoded under the row-transport budget.
    let array_item = [
        size_of::<AttributeDefinition>(),
        size_of::<SenseDefinition>(),
        size_of::<DefinitionPin>(),
        <crate::body::BodyPolicy as DefinitionAllocation>::array_item_bytes(),
        size_of::<Value>(),
    ]
    .into_iter()
    .max()
    .ok_or(InstallError::Capacity)?;
    let mut construction = reserve_typed_parse::<Manifest>(
        &manifest_row.payload,
        array_item,
        Some(size_of::<(usize, String, Value)>().max(size_of::<(
            serde::__private229::de::Content<'static>,
            serde::__private229::de::Content<'static>,
        )>())),
        budget,
    )?;
    let manifest: Manifest =
        serde_json::from_value(manifest_value).map_err(|_| InstallError::DefinitionBody)?;
    drop(_json);
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
    let map_keys = input
        .attributes
        .iter()
        .chain(input.senses.iter())
        .try_fold(0usize, |bytes, input| bytes.checked_add(input.pin.id.len()))
        .ok_or(InstallError::Capacity)?;
    let profile_keys = input
        .response_profiles
        .iter()
        .try_fold(0usize, |bytes, input| {
            bytes.checked_add(profile_key_len(&input.pin).ok()?)
        })
        .ok_or(InstallError::Capacity)?;
    let metadata_bytes = heap_sum([
        size_of::<crate::simulation::InstalledWorld>()
            + 2 * size_of::<usize>()
            + align_of::<crate::simulation::InstalledWorld>()
            - 1,
        map_storage::<String, VerifiedDefinition<AttributeDefinition>>(manifest.definitions.len())
            .ok_or(InstallError::Capacity)?,
        map_storage::<String, VerifiedDefinition<SenseDefinition>>(manifest.senses.len())
            .ok_or(InstallError::Capacity)?,
        map_storage::<String, VerifiedDefinition<NativeResponseProfile>>(
            input.response_profiles.len(),
        )
        .ok_or(InstallError::Capacity)?,
        map_keys,
        profile_keys,
        manifest
            .default_senses
            .heap_bytes()
            .ok_or(InstallError::Capacity)?,
    ])
    .ok_or(InstallError::Capacity)?;
    let metadata = budget
        .reserve(metadata_bytes)
        .map_err(|_| InstallError::Capacity)?;
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
        let definition = input.verify(definition, &mut construction, budget)?;
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
        let definition = input.verify(definition, &mut construction, budget)?;
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
    let acoustics = input
        .acoustics
        .verify(manifest.acoustics, &mut construction, budget)?;
    let body_policy = match (
        manifest.body_policy,
        manifest.body_policy_pin,
        input.body_policy,
    ) {
        (None, None, None) => None,
        (Some(value), Some(pin), Some(input)) if input.pin == pin => {
            Some(input.verify(value, &mut construction, budget)?)
        }
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
    let _profile_inputs = budget
        .reserve(
            map_storage::<String, DefinitionInput>(input.response_profiles.len())
                .and_then(|n| n.checked_add(profile_keys))
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
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
        let mut profile_construction = reserve_typed_parse::<NativeResponseProfile>(
            &row.payload,
            NativeResponseProfile::array_item_bytes(),
            NativeResponseProfile::map_entry_bytes(),
            budget,
        )?;
        let value: NativeResponseProfile =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::DefinitionBody)?;
        let input = profile_inputs
            .shift_remove(&row.slot)
            .ok_or(InstallError::DefinitionPin)?;
        if response_profiles
            .insert(
                row.slot,
                input.verify(value, &mut profile_construction, budget)?,
            )
            .is_some()
        {
            return Err(InstallError::DefinitionCollision);
        }
    }
    if !profile_inputs.is_empty() {
        return Err(InstallError::DefinitionBody);
    }
    let status_row = rows::take_one_row(
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
    let status_policy =
        InstalledStatusPolicy::parse_verified(&status_row.payload, &input.status_policy, budget)?;
    // Work invocation identity uses Source canonicalJson(definition), while
    // the stored policy preserves its authored property order. JSON key order
    // changes the pin even when all current values and byte counts agree.
    let status_work =
        crate::status::compile_status_work(&status_policy, &input.status_policy.canonical, budget)?;
    let population_work = crate::status::compile_status_installation(
        &manifest_row.payload,
        &status_policy,
        &status_work,
        body_policy.as_ref().map(VerifiedDefinition::value),
        budget,
    )?;
    let capabilities = StatusCapabilities::compile(&status_policy, budget)?;
    let work_policy = Arc::new(
        InstalledWorkPolicy::verify(
            input.work_policy.canonical,
            input.work_policy.sha256,
            settings_work,
            budget,
        )
        .map_err(|_| InstallError::DefinitionBody)?,
    );
    let manifest_bytes = heap_sum([
        manifest_row.heap_bytes().ok_or(InstallError::Capacity)?,
        manifest
            .ranged_policy_pin
            .heap_bytes()
            .ok_or(InstallError::Capacity)?,
        manifest
            .activity_hosts
            .heap_bytes()
            .ok_or(InstallError::Capacity)?,
        manifest
            .recipe_families
            .heap_bytes()
            .ok_or(InstallError::Capacity)?,
        [
            manifest.appraisals.as_ref(),
            manifest.ranged_policy.as_ref(),
        ]
        .into_iter()
        .try_fold(0usize, |bytes, value| {
            bytes.checked_add(value.map_or(Some(0), |value| {
                fresh_json_bytes(value)?.checked_add(size_of::<Value>() + 2 * size_of::<usize>())
            })?)
        })
        .ok_or(InstallError::Capacity)?,
    ])
    .ok_or(InstallError::Capacity)?;
    let manifest_storage = construction
        .split_off(manifest_bytes)
        .map_err(|_| InstallError::Capacity)?;
    let manifest_storage = budget
        .adopt_record(manifest_storage)
        .map_err(|_| InstallError::Capacity)?;
    Ok(PhysicalMeanings {
        storage: budget
            .adopt_record(metadata)
            .map_err(|_| InstallError::Capacity)?,
        manifest: AuthoredManifest {
            _storage: manifest_storage,
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
        status_work,
        population_work,
        work_policy,
    })
}
