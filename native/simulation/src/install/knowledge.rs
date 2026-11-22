//! An actor's authored recipe grants are distinct from the world's recipe
//! definitions. Acquired grants require their own retained proof owner.

use super::retained::RetainedMap;
use super::rows::{take_collection, validate_map_row, validate_marker, validate_row};
use super::{InstallError, RowImport};
use crate::host::{ByteBudget, ResidentReservation, retained_size::map_storage};
use crate::records::{ChildShape, InstalledRow};
use crate::state::EntityStore;
use indexmap::IndexMap;
use serde::Deserialize;

pub(crate) struct LearnedOwner {
    pub row: InstalledRow,
    pub next_ordinal: u64,
    recipes: Vec<String>,
}
pub(crate) struct LearnedCapabilities {
    pub owners: IndexMap<String, LearnedOwner>,
    pub next_owner_ordinal: u64,
    _storage: ResidentReservation,
}
impl LearnedCapabilities {
    pub(crate) fn known_recipes(&self, actor: &str) -> &[String] {
        self.owners.get(actor).map_or(&[], |owner| &owner.recipes)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Grant<'a> {
    recipe_id: &'a str,
    learned_at: f64,
    source: &'a str,
    evidence_id: &'a str,
    #[serde(
        default,
        borrow,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    source_receipt: Option<&'a serde_json::value::RawValue>,
}

#[derive(Deserialize)]
struct RecipeAuthority<'a> {
    id: &'a str,
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
        .reserve_record(
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
                    .checked_add(row.retained_bytes().ok_or(InstallError::Capacity)?)
                    .and_then(|n| n.checked_add(row.slot.len()))
                    .and_then(|n| {
                        n.checked_add(
                            entries
                                .rows
                                .len()
                                .checked_mul(std::mem::size_of::<String>())?,
                        )
                    })
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let mut recipes = Vec::with_capacity(entries.rows.len());
        for entry in entries.rows {
            let grant: Grant<'_> =
                serde_json::from_str(&entry.payload).map_err(|_| InstallError::CurrentFormat)?;
            validate_row(
                &entry,
                &["world", "knowledge", &row.slot, grant.recipe_id],
                &row.id,
                &entry.slot,
                entries.coverage.next_ordinal,
            )?;
            if entry.slot.parse::<usize>().ok().is_none()
                || !matches!(entry.extra.as_slice(), [actor] if actor.as_str() == Some(row.slot.as_str()))
                || !grant.learned_at.is_finite()
                || grant.learned_at < 0.
                || grant.learned_at > at
                || !crate::values::is_safe_record_id(grant.recipe_id)
                || !crate::values::is_safe_record_id(grant.evidence_id)
            {
                return Err(InstallError::CurrentFormat);
            }
            if grant.source != "authored" || grant.source_receipt.is_some() {
                return Err(InstallError::UnsupportedFamily("learned method proofs"));
            }
            let definition = definitions
                .get(grant.recipe_id)
                .ok_or(InstallError::DefinitionPin)?;
            let authority: RecipeAuthority<'_> =
                serde_json::from_str(definition).map_err(|_| InstallError::DefinitionBody)?;
            if authority.id != grant.recipe_id || authority.provenance.source != "authored-world" {
                return Err(InstallError::DefinitionPin);
            }
            storage
                .resize(
                    storage
                        .bytes()
                        .checked_add(grant.recipe_id.len())
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            recipes.push(grant.recipe_id.to_owned());
        }
        let key = row.slot.clone();
        if installed
            .insert(
                key,
                LearnedOwner {
                    row,
                    next_ordinal: entries.coverage.next_ordinal,
                    recipes,
                },
            )
            .is_some()
        {
            return Err(InstallError::DuplicateRow);
        }
    }
    Ok(LearnedCapabilities {
        owners: installed,
        next_owner_ordinal: owners.coverage.next_ordinal,
        _storage: storage,
    })
}
