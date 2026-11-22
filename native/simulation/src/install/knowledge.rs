//! An actor's authored recipe grants are distinct from the world's recipe
//! definitions. Acquired grants require their own retained proof owner.

use super::retained::RetainedMap;
use super::rows::{take_collection, validate_map_row, validate_marker, validate_row};
use super::{InstallError, RowImport};
use crate::host::{
    ByteBudget, ResidentReservation,
    retained_size::{HeapBytes, heap_record, heap_sum, map_storage},
};
use crate::received::{ReceivedValueFragment, TemporalReceiptLocator, TemporalState};
use crate::records::ChildShape;
use crate::state::EntityStore;
use serde::Serialize;
use std::{borrow::Cow, sync::Arc};
mod edits;
pub(crate) use edits::LearnedJournal;
use indexmap::IndexMap;
use serde::Deserialize;

pub(crate) struct LearnedOwner {
    recipes: Vec<String>,
    grants: Vec<Arc<FundedGrant>>,
    _storage: ResidentReservation,
}
pub(crate) struct LearnedCapabilities {
    owners: IndexMap<String, LearnedOwner>,
    storage: ResidentReservation,
    map_bytes: usize,
}
impl LearnedCapabilities {
    pub(crate) fn known_recipes(&self, actor: &str) -> &[String] {
        self.owners.get(actor).map_or(&[], |owner| &owner.recipes)
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Grant {
    pub recipe_id: String,
    pub learned_at: f64,
    pub source: GrantSource,
    pub evidence_id: String,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub source_receipt: Option<TemporalReceiptLocator>,
}
#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum GrantSource {
    Authored,
    Record,
}
heap_record!(Grant {
    recipe_id,
    evidence_id,
    source_receipt
});

struct FundedGrant {
    grant: Grant,
    _storage: ResidentReservation,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MethodProof<'a> {
    pub recipe_id: &'a str,
    pub method_version: u64,
    // The installed method body uses this canonical source digest, distinct
    // from the mechanical pin carried by the physical record.
    #[serde(borrow)]
    pub method_digest: Cow<'a, str>,
    pub provenance: GrantSource,
}

pub(crate) fn witness_matches(
    temporal: &TemporalState,
    actor: &str,
    grant: &Grant,
    definition: &RecipeAuthority<'_>,
) -> bool {
    let Some(locator) = &grant.source_receipt else {
        return false;
    };
    if locator.actor_id != actor {
        return false;
    }
    let proof = temporal
        .actor(actor)
        .and_then(|owner| owner.supports())
        .and_then(|supports| supports.get(&locator.id()).ok().flatten());
    let Some(proof) = proof else { return false };
    let proof = proof.capsule();
    proof.required
        && proof.receipt.locator == *locator
        && proof.receipt.at == grant.learned_at
        && proof.receipt.header.source_ids.contains(&grant.evidence_id)
        && proof.values.iter().any(|value| {
            let ReceivedValueFragment::PersonalAccount(value) = value else {
                return false;
            };
            value.id == grant.evidence_id
                && value.event_type.as_deref() == Some("method-learned")
                && value
                    .data
                    .as_ref()
                    .and_then(|data| data.decode::<MethodProof<'_>>().ok())
                    .is_some_and(|data| {
                        data.recipe_id == grant.recipe_id
                            && data.method_version == definition.version
                            && data.method_digest == definition.digest
                            && data.provenance == grant.source
                    })
        })
}

#[derive(Deserialize)]
pub(crate) struct RecipeAuthority<'a> {
    pub id: &'a str,
    pub version: u64,
    #[serde(borrow)]
    pub digest: Cow<'a, str>,
    #[serde(borrow)]
    provenance: RecipeProvenance<'a>,
}

#[derive(Deserialize)]
struct RecipeProvenance<'a> {
    source: &'a str,
}

pub(crate) fn install_learned_capabilities(
    import: &mut RowImport,
    present: bool,
    entities: &EntityStore,
    definitions: &RetainedMap,
    temporal: &TemporalState,
    at: f64,
    budget: &ByteBudget,
) -> Result<LearnedCapabilities, InstallError> {
    let owners = take_collection(
        import,
        "mind_learned_capabilities_owners",
        "[\"world\"]",
        present,
        true,
    )?;
    let mut storage = budget
        .reserve_backing(
            map_storage::<String, LearnedOwner>(owners.rows.len()).ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let mut installed = IndexMap::with_capacity(owners.rows.len());
    for row in owners.rows {
        validate_map_row(
            &row,
            "[\"world\"]",
            "knowledge",
            &row.slot,
            owners.coverage.next_ordinal,
        )?;
        validate_marker(&row, ChildShape::Array)?;
        if !entities
            .get(&row.slot)
            .is_some_and(|entity| entity.actor.is_some())
        {
            return Err(InstallError::ParentPresence);
        }
        let entries = take_collection(import, "mind_learned_capabilities", &row.id, true, true)?;
        storage
            .resize(
                storage
                    .bytes()
                    .checked_add(row.slot.capacity())
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let mut owner_storage = budget
            .reserve_record(owner_bound(entries.rows.len(), 0).ok_or(InstallError::Capacity)?)
            .map_err(|_| InstallError::Capacity)?;
        let mut recipes = Vec::with_capacity(entries.rows.len());
        let mut grants = Vec::with_capacity(entries.rows.len());
        for (index, entry) in entries.rows.into_iter().enumerate() {
            let _workspace = budget
                .reserve(
                    entry
                        .payload
                        .len()
                        .checked_mul(2)
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            let grant: Grant =
                serde_json::from_str(&entry.payload).map_err(|_| InstallError::CurrentFormat)?;
            validate_row(
                &entry,
                &["world", "knowledge", &row.slot, &grant.recipe_id],
                &row.id,
                &entry.slot,
                entries.coverage.next_ordinal,
            )?;
            if entry.slot.parse::<usize>().ok() != Some(index)
                || !matches!(entry.extra.as_slice(), [actor] if actor.as_str() == Some(row.slot.as_str()))
                || !grant.learned_at.is_finite()
                || grant.learned_at < 0.
                || grant.learned_at > at
                || !crate::values::is_safe_record_id(&grant.recipe_id)
                || !crate::values::is_safe_record_id(&grant.evidence_id)
                || recipes.contains(&grant.recipe_id)
            {
                return Err(InstallError::CurrentFormat);
            }
            let definition = definitions
                .get(&grant.recipe_id)
                .ok_or(InstallError::DefinitionPin)?;
            let authority: RecipeAuthority<'_> =
                serde_json::from_str(definition).map_err(|_| InstallError::DefinitionBody)?;
            if authority.id != grant.recipe_id || authority.provenance.source != "authored-world" {
                return Err(InstallError::DefinitionPin);
            }
            let valid_source = match grant.source {
                GrantSource::Authored => grant.source_receipt.is_none(),
                GrantSource::Record => witness_matches(temporal, &row.slot, &grant, &authority),
            };
            if !valid_source {
                return Err(InstallError::CurrentFormat);
            }
            let granted_storage = budget
                .reserve_record(grant_bound(&grant).ok_or(InstallError::Capacity)?)
                .map_err(|_| InstallError::Capacity)?;
            owner_storage
                .resize(
                    owner_storage
                        .bytes()
                        .checked_add(grant.recipe_id.len())
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            recipes.push(grant.recipe_id.clone());
            grants.push(Arc::new(FundedGrant {
                grant,
                _storage: granted_storage,
            }));
        }
        let key = row.slot.clone();
        if installed
            .insert(
                key,
                LearnedOwner {
                    recipes,
                    grants,
                    _storage: owner_storage,
                },
            )
            .is_some()
        {
            return Err(InstallError::DuplicateRow);
        }
    }
    let map_bytes =
        map_storage::<String, LearnedOwner>(installed.capacity()).ok_or(InstallError::Capacity)?;
    Ok(LearnedCapabilities {
        owners: installed,
        storage,
        map_bytes,
    })
}

fn owner_bound(count: usize, key_bytes: usize) -> Option<usize> {
    heap_sum([
        count
            .checked_mul(std::mem::size_of::<String>() + std::mem::size_of::<Arc<FundedGrant>>())?,
        key_bytes,
    ])
}
pub(crate) fn grant_bound(grant: &Grant) -> Option<usize> {
    heap_sum([
        std::mem::size_of::<FundedGrant>() + 2 * std::mem::size_of::<usize>(),
        grant.heap_bytes()?,
    ])
}
